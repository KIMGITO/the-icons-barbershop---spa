import { SafeImage } from './ui/SafeImage';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceItem, BarberProfile } from '../types';
import {
  X,
  Check,
  Clock,
  Calendar as CalendarIcon,
  User,
  Scissors,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  Smartphone,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format, startOfDay, addDays } from 'date-fns';
import 'react-day-picker/style.css';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { bookingService } from '../services/bookingService';
import { bookingEngineService } from '../services/bookingEngineService';
import { paymentService } from '../services/paymentService';
import { businessService, BusinessHoursResult } from '../services/businessService';
import {
  parseTimeToMinutes,
  minutesToTimeString,
  minutesToHHMM,
  formatTimeDisplay,
  parseHoursRange,
  generateTimeSlots,
  generateTimeSlotsFromRange,
  createNairobiTimestamp,
  getNairobiMinutesNow,
  isTodayInNairobi,
  suggestNextFreeStart,
  SLOT_INTERVAL_MINUTES,
  NAIROBI_TIMEZONE,
} from '../utils/timeUtils';
import supabase from '@/lib/supabase';

interface BookedSlotInfo {
  time_slot: string;
  end_time: string;
  status: string;
}

export const BookingModal: React.FC = () => {
  const {
    isBookingModalOpen,
    closeBookingModal,
    services,
    barbers,
    selectedPreServiceId,
    selectedPreBarberId,
    businessInfo,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');

  // Customer Details Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+254 ');
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  // Per-step inline validation errors (shown on the relevant tab only)
  const [serviceError, setServiceError] = useState<string | null>(null);
  const [barberError, setBarberError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Availability + Payment state
  const [bookedSlots, setBookedSlots] = useState<BookedSlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [qualifiedStaff, setQualifiedStaff] = useState<
    { staffId: string; staffName: string; providerType: string }[]
  >([]);

  // Payment flow state
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'pushing' | 'awaiting_pin' | 'confirmed' | 'failed'
  >('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(
    null,
  );
  const [paymentReceipt, setPaymentReceipt] = useState<string | null>(null);

  // Confirmed booking result
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);
  const [pendingBooking, setPendingBooking] = useState<any>(null);

  // Business hours from database (same source as check_and_reserve RPC)
  const [dbBusinessHours, setDbBusinessHours] = useState<BusinessHoursResult | null>(null);
  const [businessHoursLoading, setBusinessHoursLoading] = useState(false);

  const selectedServices = services.filter((s) =>
    selectedServiceIds.includes(s.id),
  );
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.priceKsh, 0);
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.durationMinutes,
    0,
  );
  const depositBreakdown = paymentService.calculateDeposit(totalPrice, 0);
  const depositKsh = depositBreakdown.minimumDepositKsh;

  /** Resolve a concrete provider id whenever 'any' is chosen:
   *  first active barber who can perform ALL selected services. */
  const canProviderHandle = useCallback(
    (b: BarberProfile, serviceIds: string[]) => {
      if (serviceIds.length === 0) return true;
      return serviceIds.every((id) => b.servicesOfferedIds.includes(id));
    },
    [],
  );

  const resolvedProvider = useMemo(
    () => barbers.find((b) => b.id === selectedBarberId) || null,
    [barbers, selectedBarberId],
  );

  const barberDisplayName = resolvedProvider?.name || 'Master Barber';

  // Load business hours from database (same source as check_and_reserve RPC)
  useEffect(() => {
    if (!isBookingModalOpen) return;
    setBusinessHoursLoading(true);
    businessService.getBusinessHours()
      .then((hours) => {
        setDbBusinessHours(hours);
      })
      .catch((err) => {
        console.error('Failed to load business hours:', err);
        setDbBusinessHours(null);
      })
      .finally(() => setBusinessHoursLoading(false));
  }, [isBookingModalOpen]);

  // Initialize selections when modal opens
  useEffect(() => {
    if (isBookingModalOpen) {
      if (selectedPreServiceId) {
        setSelectedServiceIds([selectedPreServiceId]);
      } else {
        setSelectedServiceIds([]);
      }

      if (selectedPreBarberId) {
        setSelectedBarberId(selectedPreBarberId);
      } else {
        setSelectedBarberId('');
      }

      setServiceError(null);
      setBarberError(null);
      setScheduleError(null);

      setSelectedDate(startOfDay(addDays(new Date(), 1)));
      setSelectedTimeSlot('');
      setPaymentStatus('idle');
      setPaymentError(null);
      setCheckoutRequestId(null);
      setPaymentReceipt(null);
      setConfirmedBooking(null);
      setPendingBooking(null);

      setStep(
        selectedPreServiceId && selectedPreBarberId
          ? 3
          : selectedPreServiceId
            ? 2
            : 1,
      );
    }
  }, [isBookingModalOpen, selectedPreServiceId, selectedPreBarberId]);

  // Load available slots using the new booking engine
  useEffect(() => {
    if (!isBookingModalOpen || step !== 3 || !resolvedProvider || !selectedDate)
      return;

    const providerId = resolvedProvider.id;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setSlotsLoading(true);
    setBookedSlots([]);

    Promise.all([
      bookingService.getBookedSlots(providerId, dateStr),
      // Qualified staff for suggestions when the day is fully booked
      bookingEngineService.getQualifiedStaff(selectedServiceIds[0]),
    ])
      .then(([booked, qualified]) => {
        setBookedSlots(booked);
        setQualifiedStaff(qualified);
      })
      .catch((err) => console.error('Failed to load slots:', err))
      .finally(() => setSlotsLoading(false));
  }, [
    isBookingModalOpen,
    step,
    resolvedProvider,
    selectedDate,
    totalDuration,
    selectedServiceIds,
  ]);

  const toggleService = (id: string) => {
    setServiceError(null);
    if (selectedServiceIds.includes(id)) {
      if (selectedServiceIds.length > 1) {
        setSelectedServiceIds(selectedServiceIds.filter((sId) => sId !== id));
      }
    } else {
      setSelectedServiceIds([...selectedServiceIds, id]);
    }
  };

  const dayHours = useMemo(() => {
    if (!selectedDate) return { open: 8 * 60, close: 20 * 60 + 30 };
    const day = selectedDate.getDay();

    // Use database business hours if available (preferred - matches backend)
    if (dbBusinessHours) {
      const range = businessService.getHoursForWeekday(dbBusinessHours, day);
      if (range) {
        const open = parseTimeToMinutes(range.start);
        const close = parseTimeToMinutes(range.end);
        if (open >= 0 && close > open) {
          return { open, close };
        }
      } else {
        // Explicitly closed that day per business_hours.is_open = false
        return { open: 0, close: 0 };
      }
    }

    // Fallback to businessInfo.hours from businesses table
    const rangeStr =
      day === 0
        ? businessInfo.hours.sunday
        : day === 6
          ? businessInfo.hours.saturday
          : businessInfo.hours.weekdays;
    return parseHoursRange(rangeStr);
  }, [selectedDate, businessInfo.hours, dbBusinessHours]);
  const { open: openMin, close: closeMin } = dayHours;
  const openDisplay = formatTimeDisplay(minutesToHHMM(openMin));
  const closeDisplay = formatTimeDisplay(minutesToHHMM(closeMin));

  // Same-day bookings require at least 1 hour advance notice
  const MIN_ADVANCE_MINUTES = 60;
  // Last booking must start at least 30 minutes before closing
  const CLOSING_BUFFER_MINUTES = 30;

  const selectedDayStr = selectedDate
    ? format(selectedDate, 'yyyy-MM-dd')
    : '';
  const isSameDay = isTodayInNairobi(selectedDayStr);
  const nowMinOfDay = getNairobiMinutesNow();
  const earliestBookableMin = isSameDay
    ? Math.max(openMin, nowMinOfDay + MIN_ADVANCE_MINUTES)
    : openMin;

  const latestBookableMin = Math.max(openMin, closeMin - CLOSING_BUFFER_MINUTES);

  // Occupied ranges for the read-only busy timeline
  const busyRanges = useMemo(
    () =>
      bookedSlots
        .map((b) => {
          const start = parseTimeToMinutes(b.time_slot);
          const rawEnd = parseTimeToMinutes(b.end_time || b.time_slot);
          const end = rawEnd > start ? rawEnd : start + 30;
          return {
            start,
            end,
            label: `${formatTimeDisplay(minutesToHHMM(start))}–${formatTimeDisplay(minutesToHHMM(end))}`,
          };
        })
        .filter((r) => r.start >= 0 && r.end > r.start)
        .sort((a, b) => a.start - b.start),
    [bookedSlots],
  );

  // Current selection window in minutes
  const selectedStartMin = parseTimeToMinutes(selectedTimeSlot);
  const selectedEndMin =
    selectedStartMin >= 0 ? selectedStartMin + totalDuration : -1;

  const selectedConflict = useMemo(() => {
    if (selectedStartMin < 0) return null;
    return (
      busyRanges.find(
        (r) => selectedStartMin < r.end && selectedEndMin > r.start,
      ) || null
    );
  }, [busyRanges, selectedStartMin, selectedEndMin]);

  /** First minute >= fromMin where a full-duration window fits with no overlap.
   * Uses 15-minute slot intervals from the unified time system. */
  const suggestNextFreeStartLocal = (fromMin: number): number => {
    return suggestNextFreeStart(fromMin, busyRanges, totalDuration, closeMin, SLOT_INTERVAL_MINUTES);
  };

  const hasAnyFreeWindow = suggestNextFreeStartLocal(openMin) >= 0;

  // Live validation on every change of the typed/picked time
  const timeValidation = useMemo(() => {
    if (!selectedTimeSlot || selectedStartMin < 0) {
      return {
        status: 'idle' as const,
        message:
          'Enter or pick a start time — availability is validated instantly.',
      };
    }
    if (isSameDay && selectedStartMin < earliestBookableMin) {
      return {
        status: 'error' as const,
        message: `Same-day bookings need at least 1 hour notice — try ${formatTimeDisplay(minutesToHHMM(earliestBookableMin))} or later.`,
      };
    }
    if (selectedStartMin < openMin || selectedStartMin > latestBookableMin) {
      if (selectedStartMin > latestBookableMin && selectedStartMin < closeMin) {
        return {
          status: 'error' as const,
          message: `Last booking must start by ${formatTimeDisplay(minutesToHHMM(latestBookableMin))} (${CLOSING_BUFFER_MINUTES} min before closing).`,
        };
      }
      return {
        status: 'error' as const,
        message: `That time is outside opening hours (${openDisplay} – ${closeDisplay}).`,
      };
    }
    // The service is allowed to run past closing time — only the start time
    // must fall within business hours (strictly before closing, matching database validation).
    if (selectedConflict) {
      const nextFree = suggestNextFreeStartLocal(selectedConflict.end + SLOT_INTERVAL_MINUTES);
      const suggestion =
        nextFree >= 0
          ? `try ${formatTimeDisplay(minutesToHHMM(nextFree))} or later.`
          : 'try another date or provider.';
      return {
        status: 'error' as const,
        message: `Conflicts with a booking until ${formatTimeDisplay(minutesToHHMM(selectedConflict.end))} — ${suggestion}`,
      };
    }
    const runsPastClose = selectedEndMin > closeMin;
    return {
      status: 'success' as const,
      message: runsPastClose
        ? `Available — starts before closing at ${closeDisplay} and ends at ${formatTimeDisplay(minutesToHHMM(selectedEndMin))} (running past closing is allowed).`
        : `Available — ends at ${formatTimeDisplay(minutesToHHMM(selectedEndMin))}.`,
    };
  }, [
    selectedTimeSlot,
    selectedStartMin,
    openMin,
    closeMin,
    openDisplay,
    closeDisplay,
    selectedEndMin,
    totalDuration,
    selectedConflict,
  ]);

  const timelineSpan = Math.max(1, closeMin - openMin);
  const selectedInRange =
    selectedStartMin >= openMin && selectedStartMin <= closeMin;

  const sliderPercentage = useMemo(() => {
    if (latestBookableMin === earliestBookableMin) return 0;
    const current = selectedStartMin >= 0 ? selectedStartMin : earliestBookableMin;
    return ((current - earliestBookableMin) / (latestBookableMin - earliestBookableMin)) * 100;
  }, [selectedStartMin, earliestBookableMin, latestBookableMin]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerPhone(e.target.value);
  };

  const validateSafaricom = (): string | null => {
    const check = paymentService.formatKenyanPhone(customerPhone);
    if (!check.valid) {
      return 'Please enter a valid Safaricom number in +254 7XX XXX XXX format (e.g. +254712345678).';
    }
    const display = paymentService.formatSafaricomDisplayPhone(customerPhone);
    if (!display.valid) {
      return 'Please enter a valid Safaricom number (07XX, 01XX, 2547XX, +2547XX).';
    }
    return null;
  };

  /** Validate a single step — gates forward navigation and tab jumps. */
  const validateStep = (
    s: number,
  ): { ok: boolean; message: string } => {
    if (s === 1) {
      if (selectedServiceIds.length === 0)
        return {
          ok: false,
          message: 'Please select at least one service to continue.',
        };
      return { ok: true, message: '' };
    }
    if (s === 2) {
      if (!selectedBarberId)
        return {
          ok: false,
          message: 'Please select a master barber to continue.',
        };
      return { ok: true, message: '' };
    }
    if (s === 3) {
      if (slotsLoading)
        return {
          ok: false,
          message: 'Availability is still loading — please wait a moment.',
        };
      if (!resolvedProvider)
        return {
          ok: false,
          message: 'Please go back and select a master barber.',
        };
      if (!selectedDate)
        return {
          ok: false,
          message: 'Please select a date on the schedule tab.',
        };
      if (!selectedTimeSlot || selectedStartMin < 0)
        return {
          ok: false,
          message: 'Please enter a valid start time on the schedule tab.',
        };
      if (isSameDay && selectedStartMin < earliestBookableMin)
        return { ok: false, message: timeValidation.message };
    if (selectedStartMin < openMin || selectedStartMin > latestBookableMin)
      return { ok: false, message: timeValidation.message };
      if (selectedConflict)
        return { ok: false, message: timeValidation.message };
      return { ok: true, message: '' };
    }
    return { ok: true, message: '' };
  };

  const showStepError = (s: number, message: string) => {
    if (s === 1) setServiceError(message);
    if (s === 2) setBarberError(message);
    if (s === 3) setScheduleError(message);
  };

  const clearStepErrors = () => {
    setServiceError(null);
    setBarberError(null);
    setScheduleError(null);
  };

  const handleNext = () => {
    const check = validateStep(step);
    if (!check.ok) {
      showStepError(step, check.message);
      return;
    }
    clearStepErrors();
    setStep((step + 1) as 1 | 2 | 3 | 4 | 5);
  };

  const handlePrevious = () => {
    if (step === 5) {
      setPaymentStatus('idle');
      setPaymentError(null);
      setCheckoutRequestId(null);
    }
    clearStepErrors();
    if (step > 1) setStep((step - 1) as 1 | 2 | 3 | 4 | 5);
  };

  const handleStepClick = (target: number) => {
    if (target === step) return;
    if (target < step) {
      clearStepErrors();
      setStep(target as 1 | 2 | 3 | 4 | 5);
      return;
    }
    for (let i = 1; i < target; i++) {
      const check = validateStep(i);
      if (!check.ok) {
        setStep(i as 1 | 2 | 3 | 4 | 5);
        showStepError(i, check.message);
        return;
      }
    }
    clearStepErrors();
    setStep(target as 1 | 2 | 3 | 4 | 5);
  };

  /** Initiate the M-Pesa STK push for the 50% deposit of a reserved booking. */
  const initiateDepositPayment = async (
    bookingId: string,
    referenceNumber: string,
    amountKsh: number,
  ) => {
    setStep(5);
    setPaymentStatus('pushing');

    const res = await paymentService.initiateMpesaStkPush({
      phoneNumber: paymentService.formatKenyanPhone(customerPhone).formatted,
      amountKsh: amountKsh > 0 ? amountKsh : depositKsh > 0 ? depositKsh : 1,
      bookingId,
      referenceNumber,
      customerName: customerName.trim(),
    });

    setCheckoutRequestId(res.checkoutRequestId || null);
    setPaymentStatus('awaiting_pin');
  };

  /** Submit details → create pending booking → initiate STK push for 50% deposit. */
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    if (!customerName) {
      setPaymentError('Please enter your full name.');
      return;
    }
    if (!customerPhone) {
      setPaymentError('Please enter your M-Pesa phone number.');
      return;
    }
    const phoneErr = validateSafaricom();
    if (phoneErr) {
      setPaymentError(phoneErr);
      return;
    }
    if (!resolvedProvider) {
      setPaymentError(
        'No provider available for the selected services. Please choose another barber.',
      );
      return;
    }
    if (!selectedDate || !selectedTimeSlot) {
      setPaymentError(
        'Please go back and make sure a date and time are selected.',
      );
      return;
    }

    try {
      // 1. Create the booking atomically via check_and_reserve (race-condition-safe).
      // Use a strict 24-hour HH:mm:ss timestamp — "10:00 AM" is not parseable by Date.
      const startMinForSubmit =
        selectedStartMin >= 0 ? selectedStartMin : parseTimeToMinutes(selectedTimeSlot);
      const desiredStartTs = new Date(
        `${format(selectedDate, 'yyyy-MM-dd')}T${minutesToHHMM(startMinForSubmit)}:00+03:00`,
      ).toISOString();


      const result = await bookingEngineService.createBooking({
        customerId: null,
        // Submit ALL selected services — one atomic booking covering
        // the full list (priced and sized by the database RPC).
        serviceIds: selectedServiceIds,
        desiredStartTs,
        preferredStaffIds: [resolvedProvider.id],
        customerName: customerName.trim(),
        customerPhone:
          paymentService.formatKenyanPhone(customerPhone).formatted,
        customerEmail: customerEmail.trim() || null,
        specialRequests: specialRequests.trim() || null,
        requirePayment: true,
        paymentMethod: 'mpesa',
      });

      if (!result.success) {
        setPaymentStatus('failed');
        setPaymentError(bookingEngineService.mapError(result.error || ''));
        return;
      }

      setPendingBooking({
        bookingId: result.bookingId,
        referenceNumber: result.referenceNumber,
        totalKsh: result.totalPriceKsh,
        depositKsh: result.depositPaidKsh,
        remainingKsh: result.remainingBalanceKsh,
      });

      // 2. Initiate M-Pesa STK push for exactly the 50% deposit
      await initiateDepositPayment(
        result.bookingId!,
        result.referenceNumber!,
        result.depositPaidKsh || depositKsh,
      );
    } catch (err: any) {
      setPaymentStatus('failed');
      setPaymentError(
        err.message || 'Failed to create booking or initiate M-Pesa payment.',
      );
    }
  };

  /** Real-time subscription and polling fallback for payment status updates. */
  useEffect(() => {
    if (
      !isBookingModalOpen ||
      paymentStatus !== 'awaiting_pin' ||
      !pendingBooking?.bookingId ||
      !checkoutRequestId
    )
      return;

    let pollingInterval: number | null = null;
    let isFinished = false;

    const handleSuccess = (fresh: any) => {
      if (isFinished) return;
      isFinished = true;
      if (pollingInterval) window.clearInterval(pollingInterval);

      setPaymentStatus('confirmed');
      setPaymentReceipt(fresh.mpesa_receipt_number || fresh.receipt_number);
      setConfirmedBooking({
        ...pendingBooking,
        ...fresh,
        depositPaidKsh: Number(fresh.deposit_paid_ksh || fresh.amountKsh),
        totalPriceKsh: Number(fresh.total_price_ksh || pendingBooking.totalKsh),
        remainingBalanceKsh: Number(fresh.remaining_balance_ksh || (pendingBooking.totalKsh - (fresh.amountKsh || 0))),
        mpesaReceiptNumber: fresh.mpesa_receipt_number || fresh.receipt_number,
        paymentStatus: fresh.payment_status || 'deposit-paid',
        customerName,
        serviceNames: selectedServices.map((s) => s.name),
        barberName: barberDisplayName,
        timeSlot: formatTimeDisplay(selectedTimeSlot),
      });
    };

    const handleFailure = (msg?: string) => {
      if (isFinished) return;
      isFinished = true;
      if (pollingInterval) window.clearInterval(pollingInterval);

      setPaymentStatus('failed');
      setPaymentError(msg || 'M-Pesa payment failed or was cancelled. Please try again.');
    };

    // 1. Subscribe to the specific booking record (Realtime)
    const channel = supabase
      .channel(`payment-status-${pendingBooking.bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${pendingBooking.bookingId}`,
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            handleFailure();
            return;
          }
          const fresh = payload.new as any;
          if (fresh.status === 'confirmed' && fresh.payment_status === 'deposit-paid') {
            handleSuccess(fresh);
          }
        }
      )
      .subscribe();

    // 2. Polling fallback (every 4 seconds)
    pollingInterval = window.setInterval(async () => {
      if (isFinished) return;
      try {
        const result = await paymentService.checkPaymentStatus(checkoutRequestId);
        if (result.completed) {
          // If polling finds it's completed, fetch the fresh booking data
          const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', pendingBooking.bookingId)
            .maybeSingle();

          if (booking && booking.status === 'confirmed') {
            handleSuccess(booking);
          }
        } else if (result.status === 'failed') {
          handleFailure();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 4000);

    // 3. Overall timeout (75 seconds)
    const timeout = setTimeout(() => {
      if (!isFinished) {
        handleFailure('Transaction timed out. If you already entered your PIN, please check your SMS for confirmation or contact support.');
      }
    }, 75000);

    return () => {
      isFinished = true;
      supabase.removeChannel(channel);
      if (pollingInterval) window.clearInterval(pollingInterval);
      clearTimeout(timeout);
    };
  }, [paymentStatus, pendingBooking?.bookingId, checkoutRequestId, isBookingModalOpen]);

  const generateGoogleCalendarUrl = () => {
    if (!confirmedBooking) return '#';
    const text = encodeURIComponent(
      `The Icons Barber & Spa Appointment (${confirmedBooking.serviceNames.join(', ')})`,
    );
    const details = encodeURIComponent(
      `Master Barber: ${confirmedBooking.barberName}\nReference: ${confirmedBooking.referenceNumber}\nTotal: KSh ${confirmedBooking.totalPriceKsh}\nLocation: ${businessInfo.address.street}, ${businessInfo.address.city}`,
    );
    const location = encodeURIComponent(
      `${businessInfo.name}, ${businessInfo.address.street}, ${businessInfo.address.city}`,
    );
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}&location=${location}`;
  };

  const generateWhatsAppSummaryUrl = () => {
    if (!confirmedBooking) return '#';
    const msg = encodeURIComponent(
      `Hello The Icons Concierge, I have booked an appointment:\n\n*Reference:* ${confirmedBooking.referenceNumber}\n*Services:* ${confirmedBooking.serviceNames.join(', ')}\n*Barber:* ${confirmedBooking.barberName}\n*Date & Time:* ${confirmedBooking.date} at ${confirmedBooking.timeSlot}\n*Client:* ${confirmedBooking.customerName} (${customerPhone})\n*Deposit Paid:* KSh ${confirmedBooking.depositPaidKsh || depositKsh}\n*Total:* KSh ${confirmedBooking.totalPriceKsh}`,
    );
    return `https://wa.me/254712345678?text=${msg}`;
  };

  if (!isBookingModalOpen) return null;

  return (
    <div
      id="booking-modal-backdrop"
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={closeBookingModal}
    >
      <div
        id="booking-modal-content"
        className="relative w-full max-w-3xl bg-card border border-border-strong rounded-sm shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-card-elevated border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-secondary border border-primary/50 flex items-center justify-center text-primary">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Book Your Experience
                {step < 5 && (
                  <span className="text-xs font-mono text-primary font-normal">
                    (Step {step} of 4)
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {businessInfo.name} • {businessInfo.address.street},{' '}
                {businessInfo.address.city}
              </p>
            </div>
          </div>

          <button
            id="close-booking-modal-btn"
            onClick={closeBookingModal}
            className="w-8 h-8 rounded-sm bg-secondary hover:bg-secondary-hover border border-border-strong flex items-center justify-center text-muted-foreground-light hover:text-white transition-colors"
            aria-label="Close booking modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Wizard Steps Progress Tracker (Steps 1-4) */}
        {step < 5 && (
          <div className="grid grid-cols-4 bg-background border-b border-border-subtle text-center text-[11px] font-medium">
            {[
              { num: 1, label: '1. Services' },
              { num: 2, label: '2. Barber' },
              { num: 3, label: '3. Schedule' },
              { num: 4, label: '4. Details' },
            ].map((s) => {
              const isCurrent = step === s.num;
              const isDone = step > s.num;
              const canJump =
                s.num <= step ||
                [1, 2, 3]
                  .slice(0, s.num - 1)
                  .every((i) => validateStep(i).ok);
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => handleStepClick(s.num)}
                  disabled={isCurrent}
                  title={
                    canJump
                      ? `Go to step ${s.num}`
                      : 'Complete the previous steps first'
                  }
                  className={`py-2.5 px-1 border-r border-border-subtle last:border-r-0 transition-colors ${
                    isCurrent
                      ? 'bg-secondary text-primary font-bold border-b-2 border-b-primary'
                      : isDone
                        ? 'text-muted-foreground bg-card hover:bg-secondary/60 cursor-pointer'
                        : canJump
                          ? 'text-muted-foreground/70 bg-card hover:bg-secondary/40 cursor-pointer'
                          : 'text-muted-foreground/40'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Modal Body Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Select Services */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Select Your Treatment(s)
                </h3>
                <span className="text-xs text-muted-foreground">
                  {selectedServiceIds.length} selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {services.map((service) => {
                  const isSelected = selectedServiceIds.includes(service.id);
                  return (
                    <div
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`p-3.5 rounded-sm border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isSelected
                          ? 'bg-secondary border-primary shadow-sm'
                          : 'bg-background border-border hover:border-border-strong'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs sm:text-sm font-bold text-white">
                            {service.name}
                          </h4>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {service.shortDescription}
                        </p>
                        <div className="flex items-center gap-3 pt-1 text-[11px]">
                          <span className="text-muted-foreground-light flex items-center gap-1">
                            <Clock className="w-3 h-3 text-primary" />{' '}
                            {service.durationMinutes} min
                          </span>
                          <span className="font-mono font-bold text-primary">
                            KSh {service.priceKsh.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-sm border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border-strong'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {serviceError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-sm text-xs text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{serviceError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Select Barber */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Select Your Master Barber
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Please choose a specific master barber. If your preferred master
                is fully booked, go back here and pick another.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {barbers.map((barber) => {
                  const isSelected = selectedBarberId === barber.id;
                  const cannotHandle =
                    selectedServiceIds.length > 0 &&
                    !canProviderHandle(barber, selectedServiceIds);
                  return (
                    <div
                      key={barber.id}
                      onClick={() => {
                        if (!cannotHandle) {
                          setSelectedBarberId(barber.id);
                          setBarberError(null);
                        }
                      }}
                      className={`p-3.5 rounded-sm border transition-all flex items-center gap-3.5 ${
                        cannotHandle
                          ? 'opacity-40 cursor-not-allowed bg-background border-border'
                          : isSelected
                            ? 'cursor-pointer bg-secondary border-primary'
                            : 'cursor-pointer bg-background border-border hover:border-border-strong'
                      }`}
                    >
                      <SafeImage
                        src={barber.avatarUrl}
                        alt={barber.name}
                        className="w-12 h-12 rounded-sm object-cover border border-border-strong flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {barber.name}
                        </h4>
                        <p className="text-[10px] text-primary uppercase tracking-wider font-semibold truncate">
                          {barber.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {barber.specialty}
                        </p>
                        {cannotHandle && (
                          <p className="text-[10px] text-destructive mt-0.5">
                            Cannot perform all selected services
                          </p>
                        )}
                      </div>
                      <div
                        className={`w-5 h-5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-border-strong'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {barberError && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-sm text-xs text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{barberError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Select Date & Time Slot */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Date Selection — react-day-picker calendar */}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3">
                  1. Select Date
                </h3>
                <div className="bg-background border border-border rounded-sm p-3 flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setScheduleError(null);
                      setSelectedDate(date);
                      setSelectedTimeSlot('');
                    }}
                    disabled={{
                      before: startOfDay(new Date()),
                      after: addDays(new Date(), 45),
                    }}
                    className="booking-calendar !font-sans"
                  />
                </div>
                {selectedDate && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    Selected:{' '}
                    <span className="text-primary font-mono font-semibold">
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </span>
                  </p>
                )}
              </div>

              {/* Busy Timeline — read-only day context */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    2. {barberDisplayName}'s Day
                  </h3>
                  {slotsLoading && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Loading
                      bookings...
                    </span>
                  )}
                </div>

                {!resolvedProvider ? (
                  <p className="text-xs text-destructive p-3 bg-destructive/10 border border-destructive/30 rounded-sm">
                    No provider is available for the selected services. Go back
                    and pick another barber.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{openDisplay}</span>
                      <span className="text-primary font-semibold">
                        {totalDuration} min
                      </span>
                      <span>{closeDisplay}</span>
                    </div>

                    {/* Horizontal timeline spanning opening hours */}
                    <div className="relative h-10 bg-background border border-border rounded-sm overflow-hidden">
                      {Array.from(
                        {
                          length: Math.max(
                            1,
                            Math.floor(timelineSpan / 60) + 1,
                          ),
                        },
                        (_, i) => openMin + i * 60,
                      )
                        .filter((m) => m <= closeMin)
                        .map((m) => (
                          <div
                            key={m}
                            className="absolute top-0 bottom-0 w-px bg-border-subtle"
                            style={{
                              left: `${((m - openMin) / timelineSpan) * 100}%`,
                            }}
                          />
                        ))}

                      {busyRanges.map((r, i) => (
                        <div
                          key={`${r.start}-${r.end}-${i}`}
                          title={`Booked: ${r.label}`}
                          className="absolute top-0 bottom-0 bg-destructive/70 border-x border-destructive"
                          style={{
                            left: `${((r.start - openMin) / timelineSpan) * 100}%`,
                            width: `${((r.end - r.start) / timelineSpan) * 100}%`,
                          }}
                        >
                          <span className="absolute inset-x-0 top-0 text-[8px] leading-tight text-white px-1 py-0.5 truncate">
                            {r.label}
                          </span>
                        </div>
                      ))}

                      {selectedInRange && selectedStartMin >= 0 && (
                        <div
                          className="absolute top-0 bottom-0 bg-primary/30 border-y-2 border-primary flex items-center justify-center"
                          style={{
                            left: `${((selectedStartMin - openMin) / timelineSpan) * 100}%`,
                            width: `${((Math.min(selectedEndMin, closeMin) - selectedStartMin) / timelineSpan) * 100}%`,
                          }}
                        >
                          <span className="text-[8px] font-bold text-white px-1 truncate">
                            You —{' '}
                            {formatTimeDisplay(
                              minutesToHHMM(selectedStartMin),
                            )}
                            –{formatTimeDisplay(minutesToHHMM(selectedEndMin))}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 bg-destructive/70 rounded-sm" />
                        Booked
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block w-2.5 h-2.5 bg-primary/30 border border-primary rounded-sm" />
                        Your selection
                      </span>
                      {busyRanges.length === 0 && !slotsLoading && (
                        <span className="text-success">
                          No bookings yet — the whole day is open.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Time Selection — Interactive Slider */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    3. Select Start Time
                  </h3>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {selectedTimeSlot ? formatTimeDisplay(selectedTimeSlot) : '--:--'}
                  </span>
                </div>

                <div className="space-y-6">
                  {/* The Slider Component */}
                  <div className="px-2 pt-4 pb-2">
                    <div className="relative h-6 flex items-center">
                      <input
                        type="range"
                        min={earliestBookableMin}
                        max={latestBookableMin}
                        step={SLOT_INTERVAL_MINUTES}
                        value={selectedStartMin >= 0 ? selectedStartMin : earliestBookableMin}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setScheduleError(null);
                          setSelectedTimeSlot(minutesToHHMM(val));
                        }}
                        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover transition-all"
                      />
                      
                      {/* Slider Min/Max Labels */}
                      <div className="absolute -bottom-5 left-0 right-0 flex justify-between text-[9px] text-muted-foreground font-mono uppercase tracking-tighter">
                        <span>{formatTimeDisplay(minutesToHHMM(earliestBookableMin))}</span>
                        <span>{formatTimeDisplay(minutesToHHMM(latestBookableMin))}</span>
                      </div>

                      {/* Current Selection Tooltip above slider */}
                      {selectedStartMin >= 0 && (
                        <div 
                          className="absolute -top-7 px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-sm shadow-lg transform -translate-x-1/2 pointer-events-none after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-primary"
                          style={{
                            left: `${sliderPercentage}%`
                          }}
                        >
                          {formatTimeDisplay(selectedTimeSlot)}
                        </div>
                      )}
                    </div>
                  </div>

                  {!slotsLoading && (
                    <p className="text-[10px] text-muted-foreground">
                      Slide to pick your preferred start time. Bookings must start at least {CLOSING_BUFFER_MINUTES} minutes before closing ({closeDisplay}).
                    </p>
                  )}

                  {scheduleError && (
                    <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-sm text-xs text-destructive">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{scheduleError}</span>
                    </div>
                  )}

                  {!slotsLoading && (
                    <div
                      className={`flex items-start gap-2 p-3 rounded-sm border text-xs ${
                        timeValidation.status === 'success'
                          ? 'bg-success/10 border-success/40 text-success'
                          : timeValidation.status === 'error'
                            ? 'bg-destructive/10 border-destructive/30 text-destructive'
                            : 'bg-secondary/40 border-border text-muted-foreground'
                      }`}
                    >
                      {timeValidation.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : timeValidation.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{timeValidation.message}</span>
                    </div>
                  )}

                  {!slotsLoading &&
                    hasAnyFreeWindow &&
                    timeValidation.status === 'error' &&
                    selectedConflict && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedTimeSlot(
                            minutesToHHMM(
                              suggestNextFreeStartLocal(selectedConflict.end + SLOT_INTERVAL_MINUTES),
                            ),
                          )
                        }
                        className="text-[11px] text-primary underline cursor-pointer"
                      >
                        Snap to suggested free time
                      </button>
                    )}

                  {!slotsLoading && !hasAnyFreeWindow && (
                    <div className="p-3 bg-secondary/50 border border-border rounded-sm space-y-2">
                      <p className="text-xs text-muted-foreground">
                        No {totalDuration}-minute window is free for{' '}
                        {barberDisplayName} on{' '}
                        {selectedDate
                          ? format(selectedDate, 'yyyy-MM-dd')
                          : 'this date'}
                        . Please try another date or provider.
                      </p>
                      {qualifiedStaff.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          <span className="text-primary font-semibold">
                            Masters qualified for this service:
                          </span>{' '}
                          {qualifiedStaff.map((q) => q.staffName).join(', ')}
                          {' — '}try another date or select one of them
                          specifically.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Client Contact Details */}
          {step === 4 && (
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Enter Your Contact Information
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-foreground/90 font-semibold mb-1">
                    Full Name <span className="text-primary">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Kiprono Tanui"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="py-2.5 rounded-sm"
                    icon={<User className="w-4 h-4" />}
                  />
                </div>

                <div>
                  <label className="block text-foreground/90 font-semibold mb-1">
                    Phone Number (M-Pesa / SMS, Safaricom){' '}
                    <span className="text-primary">*</span>
                  </label>
                  <Input
                    type="tel"
                    required
                    placeholder="+254 7XX XXX XXX"
                    value={customerPhone}
                    onChange={handlePhoneChange}
                    className="py-2.5 rounded-sm font-mono"
                    icon={<Phone className="w-4 h-4" />}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    We send the M-Pesa deposit prompt to this Safaricom number
                    (+254 format).
                  </p>
                </div>

                <div>
                  <label className="block text-foreground/90 font-semibold mb-1">
                    Email Address (Optional for digital calendar invite)
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. name@company.co.ke"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="py-2.5 rounded-sm"
                    icon={<Mail className="w-4 h-4" />}
                  />
                </div>

                <div>
                  <label className="block text-foreground/90 font-semibold mb-1">
                    Special Requests or Styling Notes (Optional)
                  </label>
                  <Input
                    multiline
                    rows={2}
                    placeholder="e.g. Prefer low skin taper, warm towel eucalyptus aroma..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    className="p-2.5 rounded-sm"
                  />
                </div>
              </div>

              {paymentError && (
                <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-sm text-xs text-destructive">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {/* Order Summary Box with 50% deposit */}
              <div className="p-4 bg-secondary border border-border rounded-sm space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Services ({selectedServices.length}):</span>
                  <span className="text-white">
                    {selectedServices.map((s) => s.name).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Master Barber:</span>
                  <span className="text-primary font-semibold">
                    {barberDisplayName}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Date & Time:</span>
                  <span className="font-mono text-white">
                    {selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''} at{' '}
                    {formatTimeDisplay(selectedTimeSlot || '')}
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Duration:</span>
                  <span className="text-white">{totalDuration} min</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-bold">
                  <span className="text-white">Total Experience:</span>
                  <span className="font-mono text-primary text-base">
                    KSh {totalPrice.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Lock className="w-3 h-3 text-primary" /> 50% Deposit via
                    M-Pesa (secures slot)
                  </span>
                  <span className="font-mono font-bold text-white">
                    KSh {depositKsh.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Balance due at chair</span>
                  <span className="font-mono font-bold text-white">
                    KSh {depositBreakdown.remainingKsh.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full uppercase tracking-wider text-xs shadow-xl"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Confirm & Pay 50% Deposit (M-Pesa)</span>
                </Button>
                <p className="text-[10px] text-red-600 text-danger text-center mt-2">
                  Your slot is held as pending until the M-Pesa deposit is
                  confirmed.
                </p>
              </div>
            </form>
          )}

          {/* STEP 5: Payment / Booking Confirmation */}
          {step === 5 && (
            <div className="text-center py-6 space-y-6 animate-fadeIn">
              {paymentStatus === 'pushing' ||
              paymentStatus === 'awaiting_pin' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary text-primary flex items-center justify-center mx-auto shadow-lg">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                      {paymentStatus === 'pushing'
                        ? 'Reserving Your Slot'
                        : 'Awaiting M-Pesa Confirmation'}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white">
                      {paymentStatus === 'pushing'
                        ? 'Creating Your Reservation'
                        : 'Enter your M-Pesa PIN to confirm'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground-light max-w-md mx-auto">
                      {paymentStatus === 'pushing'
                        ? 'We are securely reserving your preferred slot and sending the deposit prompt.'
                        : `A prompt for KSh ${depositKsh.toLocaleString()} has been sent to +${paymentService.formatKenyanPhone(customerPhone).formatted.replace(/^\+?/, '')}. Your booking is confirmed automatically once the payment clears.`}
                    </p>
                  </div>
                  {pendingBooking && (
                    <div className="max-w-md mx-auto bg-secondary border border-border-strong p-5 rounded-sm text-left space-y-3 text-xs">
                      <div className="flex justify-between items-center pb-2 border-b border-border">
                        <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                          Booking Reference
                        </span>
                        <span className="font-mono font-bold text-primary text-sm">
                          {pendingBooking.referenceNumber}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-foreground/90">
                        <p>
                          <strong className="text-white">Provider:</strong>{' '}
                          {barberDisplayName}
                        </p>
                        <p>
                          <strong className="text-white">Date & Time:</strong>{' '}
                          {selectedDate
                            ? format(selectedDate, 'yyyy-MM-dd')
                            : ''}{' '}
                          @ {formatTimeDisplay(selectedTimeSlot || '')}
                        </p>
                        <p>
                          <strong className="text-white">Total:</strong> KSh{' '}
                          {pendingBooking.totalKsh?.toLocaleString?.() ||
                            totalPrice.toLocaleString()}
                        </p>
                        <p>
                          <strong className="text-white">
                            Deposit Required:
                          </strong>{' '}
                          KSh {depositKsh.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">
                    Please do not close this window. We will update
                    automatically once payment is confirmed (typically under 30
                    seconds).
                  </p>
                </>
              ) : paymentStatus === 'confirmed' && confirmedBooking ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-secondary border-2 border-primary text-primary flex items-center justify-center mx-auto shadow-lg">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
                      Deposit Confirmed — Booking Secured
                    </span>
                    <h3 className="text-2xl font-bold text-white">
                      We Look Forward to Welcoming You
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground-light max-w-md mx-auto">
                      Your 50% deposit has been received and your chair is
                      reserved at {businessInfo.name},{' '}
                      {businessInfo.address.street}, {businessInfo.address.city}
                      .
                    </p>
                  </div>

                  {/* Reference Card */}
                  <div className="max-w-md mx-auto bg-secondary border border-border-strong p-5 rounded-sm text-left space-y-3 text-xs">
                    <div className="flex justify-between items-center pb-2 border-b border-border">
                      <span className="text-muted-foreground uppercase tracking-wider text-[10px]">
                        Booking Reference
                      </span>
                      <span className="font-mono font-bold text-primary text-sm">
                        {confirmedBooking.referenceNumber}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-foreground/90">
                      <p>
                        <strong className="text-white">Client:</strong>{' '}
                        {confirmedBooking.customerName}
                      </p>
                      <p>
                        <strong className="text-white">Barber:</strong>{' '}
                        {confirmedBooking.barberName}
                      </p>
                      <p>
                        <strong className="text-white">Date & Time:</strong>{' '}
                        {confirmedBooking.date} @ {confirmedBooking.timeSlot}
                      </p>
                      <p>
                        <strong className="text-white">Services:</strong>{' '}
                        {confirmedBooking.serviceNames.join(', ')}
                      </p>
                      <p>
                        <strong className="text-white">
                          Deposit Paid (M-Pesa):
                        </strong>{' '}
                        KSh{' '}
                        {confirmedBooking.depositPaidKsh?.toLocaleString?.() ||
                          depositKsh.toLocaleString()}{' '}
                        {confirmedBooking.mpesaReceiptNumber && (
                          <span className="text-primary font-mono">
                            • {confirmedBooking.mpesaReceiptNumber}
                          </span>
                        )}
                      </p>
                      <p>
                        <strong className="text-white">Total:</strong> KSh{' '}
                        {confirmedBooking.totalPriceKsh?.toLocaleString?.() ||
                          totalPrice.toLocaleString()}
                      </p>
                      <p className="text-muted-foreground">
                        <strong className="text-white">
                          Balance at Chair:
                        </strong>{' '}
                        KSh{' '}
                        {confirmedBooking.remainingBalanceKsh?.toLocaleString?.() ||
                          depositBreakdown.remainingKsh.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                    <a
                      href={generateGoogleCalendarUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-1/2 py-2.5 px-3 bg-secondary hover:bg-secondary-hover text-white border border-border-strong text-xs font-semibold rounded-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                      <span>Add to Calendar</span>
                    </a>

                    <a
                      href={generateWhatsAppSummaryUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-1/2 py-2.5 px-3 bg-secondary hover:bg-secondary-hover text-success border border-success/40 text-xs font-semibold rounded-sm transition-colors flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Save on WhatsApp</span>
                    </a>
                  </div>

                  <div className="pt-4">
                    <button
                      onClick={closeBookingModal}
                      className="text-xs text-muted-foreground hover:text-white underline cursor-pointer"
                    >
                      Return to Website
                    </button>
                  </div>
                </>
              ) : paymentStatus === 'failed' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-destructive/10 border-2 border-destructive text-destructive flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-destructive font-semibold">
                      Payment Not Completed
                    </span>
                    <h3 className="text-xl font-bold text-white">
                      Your booking is not yet confirmed
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground-light max-w-md mx-auto">
                      {paymentError ||
                        'The M-Pesa payment did not complete, so your slot has not been secured. You can retry without losing your selection.'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
                    <Button
                      variant="primary"
                      onClick={async () => {
                        setPaymentError(null);
                        // Retry re-uses the already-reserved pending booking —
                        // never create a duplicate booking for a retry.
                        if (
                          pendingBooking?.bookingId &&
                          pendingBooking?.referenceNumber
                        ) {
                          try {
                            await initiateDepositPayment(
                              pendingBooking.bookingId,
                              pendingBooking.referenceNumber,
                              pendingBooking.depositKsh || depositKsh,
                            );
                          } catch (err: any) {
                            setPaymentStatus('failed');
                            setPaymentError(
                              err.message ||
                                'Failed to initiate M-Pesa payment.',
                            );
                          }
                        } else {
                          setPaymentStatus('pushing');
                          handleSubmitBooking(new Event('submit') as any);
                        }
                      }}
                      className="w-full sm:w-auto"
                    >
                      <Smartphone className="w-4 h-4 mr-1" />
                      Retry Payment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={closeBookingModal}
                      className="w-full sm:w-auto"
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* Modal Footer Controls (Steps 1-4) — back navigation is always available */}
        {(step < 5 || (step === 5 && paymentStatus === 'failed')) && (
          <div className="p-4 sm:p-5 bg-card-elevated border-t border-border-subtle flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handlePrevious}
                className="text-xs gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">
                Total:{' '}
                <span className="text-primary font-mono font-bold">
                  KSh {totalPrice.toLocaleString()}
                </span>
              </div>
            )}

            {step === 4 ? (
              <div className="text-[10px] text-muted-foreground text-right leading-tight">
                Review the summary below, then confirm payment to secure your
                slot.
              </div>
            ) : step === 5 ? (
              <div className="w-8" />
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                className="text-xs uppercase font-bold tracking-wider gap-1.5"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
