import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Scissors, User, Phone, CheckCircle2 } from 'lucide-react';
import { useBookingStore } from '../../../stores/bookingStore';
import { useProviderStore } from '../../../stores/providerStore';
import { useServiceStore } from '../../../stores/serviceStore';
import { paymentService } from '../../../services/paymentService';
import { PaymentSummary } from '../payments/PaymentSummary';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { ThemeSelect } from '../../ui/ThemeSelect';

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIME_SLOTS = [
  '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM',
  '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM',
  '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM',
  '05:30 PM', '06:00 PM', '06:30 PM'
];

export const NewBookingModal: React.FC<NewBookingModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const { createBooking } = useBookingStore();
  const { providers, loadProviders } = useProviderStore();
  const { services, loadServices } = useServiceStore();

  useEffect(() => {
    loadProviders();
    loadServices();
  }, [loadProviders, loadServices]);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+254 ');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('10:00 AM');
  const [depositChoice, setDepositChoice] = useState<'none' | 'deposit' | 'full'>('deposit');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default service and provider when loaded
  useEffect(() => {
    if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  const selectedService = services.find(s => s.id === selectedServiceId) || services[0];
  const totalPrice = selectedService ? selectedService.priceKsh : 1500;
  const depositBreakdown = paymentService.calculateDeposit(totalPrice);

  // Filter providers eligible for selected service
  const eligibleProviders = providers.filter(p => 
    p.status === 'active' && 
    (!selectedServiceId || !p.servicesOfferedIds || p.servicesOfferedIds.length === 0 || p.servicesOfferedIds.includes(selectedServiceId))
  );

  useEffect(() => {
    if (eligibleProviders.length > 0) {
      // If current provider is not eligible, switch to first eligible
      if (!eligibleProviders.some(p => p.id === selectedProviderId)) {
        setSelectedProviderId(eligibleProviders[0].id);
      }
    } else if (providers.length > 0) {
      setSelectedProviderId(providers[0].id);
    }
  }, [selectedServiceId, eligibleProviders, providers, selectedProviderId]);

  const selectedProvider = providers.find(p => p.id === selectedProviderId) || providers[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Please provide customer name.');
      return;
    }

    if (!customerPhone.trim()) {
      setError('Please provide customer contact phone number.');
      return;
    }

    try {
      setIsSubmitting(true);

      const depositPaid = depositChoice === 'full' 
        ? totalPrice 
        : depositChoice === 'deposit' 
        ? depositBreakdown.minimumDepositKsh 
        : 0;

      await createBooking({
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || `${customerName.toLowerCase().replace(/\s+/g, '')}@theicons.client`,
        serviceIds: [selectedService.id],
        serviceNames: [selectedService.name],
        providerId: selectedProvider?.id || 'provider-1',
        providerName: selectedProvider?.fullName || 'Artisan Specialist',
        date,
        timeSlot,
        durationMinutes: selectedService.durationMinutes,
        totalPriceKsh: totalPrice,
        depositPaidKsh: depositPaid,
        remainingBalanceKsh: Math.max(0, totalPrice - depositPaid),
        status: 'confirmed',
        paymentStatus: depositPaid >= totalPrice ? 'paid' : depositPaid > 0 ? 'deposit-paid' : 'unpaid',
        paymentMethod: depositPaid > 0 ? 'mpesa' : 'cash',
        mpesaReceiptNumber: depositPaid > 0 ? `ICN${Math.floor(1000 + Math.random() * 9000)}` : undefined,
        specialRequests: specialRequests.trim() || undefined
      });

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Failed to create booking.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-bold text-foreground">
              New Appointment Booking
            </h3>
            <p className="text-xs text-muted-foreground">
              Schedule an in-house client or phone reservation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Client Full Name *
              </label>
              <Input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Eric Kimani"
                className="rounded-xl py-2 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Phone Number *
              </label>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="rounded-xl py-2 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Email Address (Optional)
            </label>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="client@gmail.com"
              className="rounded-xl py-2 text-xs"
            />
          </div>

          {/* Service & Provider */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Select Service *
              </label>
              <ThemeSelect
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full"
                searchable
                searchPlaceholder="Search services..."
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (KSh {s.priceKsh.toLocaleString()})
                  </option>
                ))}
              </ThemeSelect>
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Assigned Service Provider *
              </label>
              <ThemeSelect
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                className="w-full"
                searchable
                searchPlaceholder="Search providers..."
              >
                {eligibleProviders.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.providerType.replace('-', ' ')})
                  </option>
                ))}
              </ThemeSelect>
            </div>
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Appointment Date *
              </label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl py-2 text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Time Slot *
              </label>
              <ThemeSelect
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full"
                searchable
                searchPlaceholder="Filter time..."
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </ThemeSelect>
            </div>
          </div>

          {/* Deposit Breakdown preview */}
          {selectedService && (
            <PaymentSummary 
              totalPriceKsh={totalPrice} 
              depositPaidKsh={depositChoice === 'full' ? totalPrice : depositChoice === 'deposit' ? depositBreakdown.minimumDepositKsh : 0}
            />
          )}

          {/* Initial Deposit Status Choice */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Initial Deposit Collection
            </label>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => setDepositChoice('deposit')}
                className={`p-2 rounded-xl border transition-all ${
                  depositChoice === 'deposit'
                    ? 'border-primary bg-primary/10 text-foreground font-bold'
                    : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                Collect 50% (KSh {depositBreakdown.minimumDepositKsh.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setDepositChoice('full')}
                className={`p-2 rounded-xl border transition-all ${
                  depositChoice === 'full'
                    ? 'border-primary bg-primary/10 text-foreground font-bold'
                    : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                Full Prepay (KSh {totalPrice.toLocaleString()})
              </button>
              <button
                type="button"
                onClick={() => setDepositChoice('none')}
                className={`p-2 rounded-xl border transition-all ${
                  depositChoice === 'none'
                    ? 'border-primary bg-primary/10 text-foreground font-bold'
                    : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                Pay On Arrival
              </button>
            </div>
          </div>

          {/* Special Requests */}
          <div className="space-y-1">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Client Preferences / Special Notes
            </label>
            <Input
              type="text"
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="e.g. Skin sensitive to hot water, espresso requested"
              className="rounded-xl py-2 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Confirming...' : 'Create Appointment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
