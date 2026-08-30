import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { paymentService } from '../../../services/paymentService';

interface PaymentSummaryProps {
  totalPriceKsh: number;
  depositPaidKsh?: number;
  className?: string;
}

export const PaymentSummary: React.FC<PaymentSummaryProps> = ({
  totalPriceKsh,
  depositPaidKsh = 0,
  className = ''
}) => {
  const breakdown = paymentService.calculateDeposit(totalPriceKsh, depositPaidKsh);
  const isFullyPaid = breakdown.remainingKsh === 0;

  return (
    <div className={`p-3.5 rounded-xl bg-card border border-border space-y-3 ${className}`}>
      <div className="flex items-center justify-between border-b border-border pb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Payment Breakdown
        </span>
        <span className="text-[11px] font-bold text-primary flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          50% Min Deposit Policy
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Service Total</span>
          <span className="font-bold text-foreground">KSh {breakdown.totalKsh.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Minimum Required Deposit (50%)</span>
          <span className="font-semibold text-foreground">KSh {breakdown.minimumDepositKsh.toLocaleString()}</span>
        </div>

        <div className="flex items-center justify-between text-muted-foreground">
          <span>Amount Already Paid</span>
          <span className={`font-semibold ${depositPaidKsh > 0 ? 'text-success' : 'text-foreground'}`}>
            KSh {depositPaidKsh.toLocaleString()}
          </span>
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="font-bold text-foreground">Outstanding Balance</span>
          <span className={`font-mono text-sm font-bold ${isFullyPaid ? 'text-success' : 'text-primary'}`}>
            {isFullyPaid ? 'Paid in Full (KSh 0)' : `KSh ${breakdown.remainingKsh.toLocaleString()}`}
          </span>
        </div>
      </div>

      {!isFullyPaid && (
        <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-lg border border-border/50">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            The client pays a minimum 50% deposit to secure their artisan chair. Remaining balance is settled at checkout.
          </span>
        </div>
      )}
    </div>
  );
};
