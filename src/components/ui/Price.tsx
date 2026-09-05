import React from 'react';

interface PriceProps {
  amount: number | string;
  currency?: string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const Price: React.FC<PriceProps> = ({
  amount,
  currency = 'KSh',
  className = '',
  prefix,
  suffix,
}) => {
  const formattedAmount = Number(amount).toLocaleString();

  return (
    <span className={`font-mono ${className}`}>
      {prefix && <span className="mr-1">{prefix}</span>}
      <span className="text-[0.85em] mr-0.5 opacity-80 font-sans font-bold">{currency}</span>
      {formattedAmount}
      {suffix && <span className="ml-1">{suffix}</span>}
    </span>
  );
};
