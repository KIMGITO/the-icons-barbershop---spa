import React, { useState } from 'react';
import { X, Smartphone, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { paymentService } from '../../../services/paymentService';
import { PaymentSummary } from './PaymentSummary';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';

interface MpesaPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  referenceNumber: string;
  customerName: string;
  customerPhone: string;
  totalPriceKsh: number;
  depositPaidKsh: number;
  onPaymentCompleted: (receipt: string, amount: number) => void;
}

export const MpesaPaymentModal: React.FC<MpesaPaymentModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  referenceNumber,
  customerName,
  customerPhone,
  totalPriceKsh,
  depositPaidKsh,
  onPaymentCompleted
}) => {
  if (!isOpen) return null;

  const breakdown = paymentService.calculateDeposit(totalPriceKsh, depositPaidKsh);
  const minDeposit = breakdown.minimumDepositKsh;
  const remaining = breakdown.remainingKsh;

  const defaultPayAmount = depositPaidKsh === 0 ? minDeposit : remaining;

  const [phoneNumber, setPhoneNumber] = useState(customerPhone || '+254 ');
  const [paymentOption, setPaymentOption] = useState<'deposit' | 'full' | 'custom'>(
    depositPaidKsh === 0 ? 'deposit' : 'full'
  );
  const [customAmount, setCustomAmount] = useState<number>(defaultPayAmount);
  const [status, setStatus] = useState<'idle' | 'pushing' | 'waiting_pin' | 'success' | 'error'>('idle');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedAmount = paymentOption === 'deposit' 
    ? minDeposit 
    : paymentOption === 'full' 
    ? remaining 
    : customAmount;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const phoneValidation = paymentService.formatKenyanPhone(phoneNumber);
    if (!phoneValidation.valid) {
      setErrorMessage(phoneValidation.error || 'Please provide a valid Safaricom phone number.');
      return;
    }

    if (selectedAmount < 1) {
      setErrorMessage('Please enter an amount greater than 0.');
      return;
    }

    try {
      setStatus('pushing');
      
      const res = await paymentService.initiateMpesaStkPush({
        phoneNumber: phoneValidation.formatted,
        amountKsh: selectedAmount,
        bookingId,
        referenceNumber,
        customerName
      });

      setStatus('waiting_pin');

      // Simulate customer entering PIN after 2 seconds
      setTimeout(() => {
        setStatus('success');
        setReceipt(res.receiptNumber || 'ICN-MP-9842');
        onPaymentCompleted(res.receiptNumber || 'ICN-MP-9842', selectedAmount);
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'M-Pesa payment failed. Please check phone number and retry.');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setErrorMessage(null);
    setReceipt(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                M-Pesa Payment
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Ref: <span className="font-mono text-foreground font-semibold">{referenceNumber}</span> • {customerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Deposit Calculation Summary */}
        <PaymentSummary totalPriceKsh={totalPriceKsh} depositPaidKsh={depositPaidKsh} />

        {/* Success State */}
        {status === 'success' ? (
          <div className="py-6 text-center space-y-3 bg-muted/30 rounded-xl p-4 border border-success/30">
            <div className="w-12 h-12 rounded-full bg-success/20 text-success flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">Payment Received</h4>
              <p className="text-xs text-muted-foreground">
                Successfully recorded payment of <span className="font-bold text-foreground">KSh {selectedAmount.toLocaleString()}</span>.
              </p>
              <div className="inline-block mt-2 px-3 py-1 bg-input rounded font-mono text-xs font-bold text-primary">
                M-Pesa Receipt: {receipt}
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleClose}
              className="w-full mt-3"
            >
              Done
            </Button>
          </div>
        ) : (
          /* Payment Initiation Form */
          <form onSubmit={handleInitiate} className="space-y-4">
            {/* Amount Selection Options */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Select Amount to Collect
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {depositPaidKsh === 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentOption('deposit')}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      paymentOption === 'deposit'
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-muted/40 text-muted-foreground hover:border-border-strong'
                    }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      50% Minimum Deposit
                    </div>
                    <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                      KSh {minDeposit.toLocaleString()}
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPaymentOption('full')}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    paymentOption === 'full'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-muted/40 text-muted-foreground hover:border-border-strong'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    {depositPaidKsh === 0 ? 'Full Prepayment' : 'Remaining Balance'}
                  </div>
                  <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                    KSh {remaining.toLocaleString()}
                  </div>
                </button>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                M-Pesa Mobile Number
              </label>
              <div className="relative">
                <Input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0712 345 678"
                  className="rounded-xl py-2.5 text-xs font-mono pr-20"
                  required
                  disabled={status === 'pushing' || status === 'waiting_pin'}
                />
                <span className="absolute right-3 top-2.5 text-[10px] text-muted-foreground font-semibold">
                  Safaricom
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Supports Kenyan formats: 07XX..., 01XX..., or 2547XX...
              </p>
            </div>

            {/* Error state display */}
            {errorMessage && (
              <div className="flex items-center gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-xl text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Live Progress feedback */}
            {status === 'waiting_pin' && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl text-xs text-foreground space-y-1 animate-pulse">
                <div className="font-bold flex items-center gap-1.5 text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  STK Push Prompt Dispatched
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Prompting customer on handset to authorize KSh {selectedAmount.toLocaleString()} with M-Pesa PIN.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={status === 'pushing' || status === 'waiting_pin'}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={status === 'pushing' || status === 'waiting_pin'}
                className="font-bold"
              >
                {status === 'pushing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Sending STK...
                  </>
                ) : status === 'waiting_pin' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Awaiting PIN...
                  </>
                ) : (
                  <>
                    <span>Prompt M-Pesa (KSh {selectedAmount.toLocaleString()})</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
