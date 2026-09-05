interface PaymentOption<T extends string = string> {
  value: T;
  label: string;
  /** Highlighted amount, e.g. "KSh 1,500". Omit if this option has no charge. */
  amountLabel?: string;
  /** Muted fallback text shown instead of amountLabel, e.g. "Unpaid". */
  helperLabel?: string;
}

interface PaymentChoiceSelectorProps<T extends string = string> {
  label: string;
  options: PaymentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export type DepositChoice = 'deposit' | 'full' | 'none';

export function PaymentChoiceSelector<T extends string = string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: PaymentChoiceSelectorProps<T>) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-xs font-semibold tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className={`grid gap-2 grid-cols-${options.length}`}>
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer min-w-0 ${
                isSelected
                  ? 'bg-primary/15 border-primary text-foreground ring-1 ring-primary/40'
                  : 'bg-input border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="font-bold text-foreground truncate">{option.label}</div>
              {option.amountLabel ? (
                <div className="text-[10px] text-primary font-mono font-bold mt-0.5 truncate">
                  {option.amountLabel}
                </div>
              ) : option.helperLabel ? (
                <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                  {option.helperLabel}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}