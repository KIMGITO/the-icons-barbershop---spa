import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Clock, Scissors, User, Phone, CheckCircle2, 
  AlertTriangle, ShieldAlert, Sparkles, X, ChevronRight, Info
} from 'lucide-react';
import { StaffBooking, StaffBookingStatus, ServiceProvider } from '../../../types/staff';
import { ServiceItem } from '../../../types';
import { useBookingStore } from '../../../stores/bookingStore';
import { useProviderStore } from '../../../stores/providerStore';
import { useServiceStore } from '../../../stores/serviceStore';
import { paymentService } from '../../../services/paymentService';
import { 
  checkBookingConflict, 
  calculateEndTime, 
  formatTimeRange,
  parseTimeToMinutes,
  minutesToTimeString 
} from '../../../utils/timeUtils';
import { CustomerSelector } from './CustomerSelector';
import { ServiceSelector } from './ServiceSelector';
import { ProviderSelector } from './ProviderSelector';
import { CustomDatePicker } from '../ui/CustomDatePicker';
import { CustomTimePicker } from '../ui/CustomTimePicker';
import { CustomSelect } from '../ui/CustomSelect';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

export interface BookingFormProps {
  mode: 'create' | 'edit';
  initialBooking?: StaffBooking | null;
  prefilledDate?: string | null;
  prefilledTime?: string | null;
  prefilledProviderId?: string | null;
  onSubmitSuccess?: (booking: StaffBooking) => void;
  onCancel?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  mode,
  initialBooking,
  prefilledDate,
  prefilledTime,
  prefilledProviderId,
  onSubmitSuccess,
  onCancel
}) => {
  const { bookings, createBooking, updateBooking } = useBookingStore();
  const { providers, loadProviders } = useProviderStore();
  const { services, loadServices } = useServiceStore();

  useEffect(() => {
    loadProviders();
    loadServices();
  }, [loadProviders, loadServices]);

  // Form states
  const [customerName, setCustomerName] = useState(initialBooking?.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialBooking?.customerPhone || '+254 ');
  const [customerEmail, setCustomerEmail] = useState(initialBooking?.customerEmail || '');

  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialBooking?.serviceIds?.[0] || ''
  );
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    initialBooking?.providerId || prefilledProviderId || ''
  );

  const [date, setDate] = useState<string>(
    initialBooking?.date || prefilledDate || new Date().toISOString().split('T')[0]
  );
  const [timeSlot, setTimeSlot] = useState<string>(
    initialBooking?.timeSlot || prefilledTime || '10:00 AM'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialBooking?.durationMinutes || 60
  );

  const [status, setStatus] = useState<StaffBookingStatus>(
    initialBooking?.status || 'confirmed'
  );
  const [depositChoice, setDepositChoice] = useState<'none' | 'deposit' | 'full'>('deposit');
  const [specialRequests, setSpecialRequests] = useState(
    initialBooking?.specialRequests || ''
  );
  const [staffNotes, setStaffNotes] = useState(
    initialBooking?.staffNotes || ''
  );

  const [allowConflictOverride, setAllowConflictOverride] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize service defaults if not set
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      const defaultService = services[0];
      setSelectedServiceId(defaultService.id);
      setDurationMinutes(defaultService.durationMinutes || 60);
    }
  }, [services, selectedServiceId]);

  // Initialize provider defaults if not set
  useEffect(() => {
    if (providers.length > 0 && !selectedProviderId) {
      setSelectedProviderId(prefilledProviderId || providers[0].id);
    }
  }, [providers, selectedProviderId, prefilledProviderId]);

  // When service changes, update duration automatically if in create mode
  const handleServiceChange = (service: ServiceItem) => {
    setSelectedServiceId(service.id);
    if (mode === 'create') {
      setDurationMinutes(service.durationMinutes || 60);
    }
  };

  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId) || services[0];
  }, [services, selectedServiceId]);

  const selectedProvider = useMemo(() => {
    return providers.find(p => p.id === selectedProviderId) || providers[0];
  }, [providers, selectedProviderId]);

  // Calculate pricing & deposit
  const totalPrice = selectedService ? selectedService.priceKsh : 1500;
  const depositBreakdown = paymentService.calculateDeposit(
    totalPrice,
    initialBooking?.depositPaidKsh || 0
  );

  // Calculated End Time
  const calculatedEndTime = useMemo(() => {
    return calculateEndTime(timeSlot, durationMinutes);
  }, [timeSlot, durationMinutes]);

  // Conflict detection
  const conflict = useMemo(() => {
    return checkBookingConflict(
      bookings,
      selectedProviderId,
      date,
      timeSlot,
      durationMinutes,
      initialBooking?.id
    );
  }, [bookings, selectedProviderId, date, timeSlot, durationMinutes, initialBooking]);

  // Helper to jump to next available slot for provider
  const handleFindNextAvailable = () => {
    if (!conflict.conflictingBooking) return;
    const conflictEnd = conflict.conflictingBooking.endTime || 
      calculateEndTime(
        conflict.conflictingBooking.timeSlot, 
        conflict.conflictingBooking.durationMinutes || 60
      );
    setTimeSlot(conflictEnd);
    setAllowConflictOverride(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please provide client name.');
      return;
    }
    if (!customerPhone.trim()) {
      setErrorMessage('Please provide client contact phone number.');
      return;
    }
    if (conflict.hasConflict && !allowConflictOverride) {
      setErrorMessage(
        `Schedule conflict with ${conflict.conflictingBooking?.customerName}. Select an alternate time or check override.`
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const calculatedDeposit = depositChoice === 'full' 
        ? totalPrice 
        : depositChoice === 'deposit' 
        ? depositBreakdown.minimumDepositKsh 
        : (initialBooking?.depositPaidKsh || 0);

      const remainingBalance = Math.max(0, totalPrice - calculatedDeposit);
      const paymentStatus = remainingBalance === 0 
        ? 'paid' 
        : calculatedDeposit > 0 
        ? 'deposit-paid' 
        : 'unpaid';

      if (mode === 'create') {
        const newBooking = await createBooking({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || `${customerName.toLowerCase().replace(/\s+/g, '')}@theicons.client`,
          serviceIds: [selectedService.id],
          serviceNames: [selectedService.name],
          providerId: selectedProvider?.id || 'provider-1',
          providerName: selectedProvider?.fullName || 'Artisan Specialist',
          date,
          timeSlot,
          endTime: calculatedEndTime,
          durationMinutes,
          totalPriceKsh: totalPrice,
          depositPaidKsh: calculatedDeposit,
          remainingBalanceKsh: remainingBalance,
          status,
          paymentStatus,
          paymentMethod: calculatedDeposit > 0 ? 'mpesa' : 'unpaid',
          specialRequests: specialRequests.trim(),
          staffNotes: staffNotes.trim()
        });

        if (onSubmitSuccess) onSubmitSuccess(newBooking);
      } else if (mode === 'edit' && initialBooking) {
        const updated = await updateBooking(initialBooking.id, {
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          serviceIds: [selectedService.id],
          serviceNames: [selectedService.name],
          providerId: selectedProvider?.id || initialBooking.providerId,
          providerName: selectedProvider?.fullName || initialBooking.providerName,
          date,
          timeSlot,
          endTime: calculatedEndTime,
          durationMinutes,
          totalPriceKsh: totalPrice,
          status,
          specialRequests: specialRequests.trim(),
          staffNotes: staffNotes.trim()
        });

        if (onSubmitSuccess) onSubmitSuccess(updated);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && (
        <div className="p-3 bg-destructive/15 border border-destructive/40 text-destructive text-xs rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Client Details with Auto-Lookup */}
      <div className="bg-muted/20 border border-border p-3.5 sm:p-4 rounded-2xl space-y-3">
        <CustomerSelector
          customerName={customerName}
          customerPhone={customerPhone}
          customerEmail={customerEmail}
          onSelectCustomer={({ name, phone, email }) => {
            setCustomerName(name);
            setCustomerPhone(phone);
            setCustomerEmail(email);
          }}
          onNameChange={setCustomerName}
          onPhoneChange={setCustomerPhone}
          onEmailChange={setCustomerEmail}
        />
      </div>

      {/* 2. Service Selection */}
      <div className="bg-muted/20 border border-border p-3.5 sm:p-4 rounded-2xl space-y-3">
        <ServiceSelector
          services={services}
          selectedServiceId={selectedServiceId}
          onSelectService={handleServiceChange}
        />
      </div>

      {/* 3. Provider Selection (Including Admin) */}
      <div className="bg-muted/20 border border-border p-3.5 sm:p-4 rounded-2xl space-y-3">
        <ProviderSelector
          providers={providers}
          selectedProviderId={selectedProviderId}
          selectedServiceId={selectedServiceId}
          onSelectProvider={p => setSelectedProviderId(p.id)}
        />
      </div>

      {/* 4. Scheduling: Date, Start Time & Duration */}
      <div className="bg-muted/20 border border-border p-3.5 sm:p-4 rounded-2xl space-y-3.5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Appointment Schedule & Duration
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CustomDatePicker
            label="Date"
            value={date}
            onChange={setDate}
          />
          <CustomTimePicker
            label="Start Time"
            value={timeSlot}
            onChange={setTimeSlot}
          />
        </div>

        {/* Duration Adjuster */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider">
              Duration
            </span>
            <span className="font-mono text-primary font-bold">
              {timeSlot} – {calculatedEndTime} ({durationMinutes} min)
            </span>
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {[30, 45, 60, 90, 120].map(mins => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                className={`py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                  durationMinutes === mins
                    ? 'bg-primary text-black font-extrabold border-primary shadow-xs'
                    : 'bg-input text-foreground border-border hover:border-primary/40'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Real-time Conflict Alert Box */}
        {conflict.hasConflict && (
          <div className="p-3 bg-warning/10 border border-warning/40 text-foreground rounded-xl space-y-2 text-xs animate-in fade-in duration-150">
            <div className="flex items-start gap-2 text-warning font-bold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Schedule Conflict Detected</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              <strong className="text-foreground">{selectedProvider?.fullName}</strong> is already booked on{' '}
              <strong className="text-foreground">{date}</strong> for{' '}
              <strong className="text-foreground">{conflict.conflictingBooking?.customerName}</strong> (
              {conflict.conflictingBooking?.timeSlot} – {conflict.conflictingBooking?.endTime || 'end'}).
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleFindNextAvailable}
                className="px-2.5 py-1 text-xs font-bold bg-primary text-black rounded-lg hover:bg-primary/90 transition-colors"
              >
                Jump to Next Available ({conflict.conflictingBooking?.endTime || 'Open'})
              </button>

              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowConflictOverride}
                  onChange={e => setAllowConflictOverride(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary/40"
                />
                <span>Override & double-book</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 5. Status & Payment (If edit mode, can adjust status) */}
      <div className="bg-muted/20 border border-border p-3.5 sm:p-4 rounded-2xl space-y-3">
        {mode === 'edit' && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Booking Status
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {(['pending', 'confirmed', 'completed', 'cancelled', 'no-show'] as StaffBookingStatus[]).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatus(st)}
                  className={`py-1.5 text-[11px] capitalize rounded-lg border font-semibold transition-all cursor-pointer ${
                    status === st
                      ? 'bg-primary text-black font-extrabold border-primary'
                      : 'bg-input text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Deposit breakdown for new bookings */}
        {mode === 'create' && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment & Deposit Policy
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDepositChoice('deposit')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                  depositChoice === 'deposit'
                    ? 'bg-primary/15 border-primary text-foreground ring-1 ring-primary/40'
                    : 'bg-input border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="font-bold text-foreground">50% Deposit</div>
                <div className="text-[10px] text-primary font-mono font-bold mt-0.5">
                  KSh {depositBreakdown.minimumDepositKsh.toLocaleString()}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepositChoice('full')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                  depositChoice === 'full'
                    ? 'bg-primary/15 border-primary text-foreground ring-1 ring-primary/40'
                    : 'bg-input border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="font-bold text-foreground">Full Payment</div>
                <div className="text-[10px] text-primary font-mono font-bold mt-0.5">
                  KSh {totalPrice.toLocaleString()}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDepositChoice('none')}
                className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                  depositChoice === 'none'
                    ? 'bg-primary/15 border-primary text-foreground ring-1 ring-primary/40'
                    : 'bg-input border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="font-bold text-foreground">Station Pay</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Unpaid
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Total Service Fee:</span>
          <span className="font-mono font-bold text-sm text-primary">
            KSh {totalPrice.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 6. Special Requests & Notes */}
      <div className="bg-muted/20 border border-border p-3.5 sm:p-4 rounded-2xl space-y-2.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Client Requests & Staff Notes
        </label>
        <Input
          multiline
          rows={2}
          value={specialRequests}
          onChange={e => setSpecialRequests(e.target.value)}
          placeholder="Client preferences, skin sensitivity, beverage request..."
          className="w-full text-foreground text-xs rounded-xl p-2.5 placeholder:text-muted-foreground"
        />
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-2.5 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-xs"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting || (conflict.hasConflict && !allowConflictOverride)}
          className="text-xs font-bold"
        >
          {isSubmitting ? (
            <span>Saving...</span>
          ) : mode === 'create' ? (
            <span>Create Appointment</span>
          ) : (
            <span>Save Changes</span>
          )}
        </Button>
      </div>
    </form>
  );
};
