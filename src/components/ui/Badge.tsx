import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral' | 'outline' | 'glass';
  pill?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  pill = false,
  className = '',
  children,
  ...props
}) => {
  const variantClassMap: Record<NonNullable<BadgeProps['variant']>, string> = {
    primary: 'badge-primary',
    secondary: 'bg-secondary text-primary border border-border',
    gold: 'badge-gold',
    success: 'badge-success',
    warning: 'badge-warning',
    destructive: 'badge-destructive',
    info: 'badge-info',
    neutral: 'badge-neutral',
    outline: 'bg-transparent border border-border text-foreground',
    glass: 'bg-white/10 backdrop-blur-md border border-white/15 text-white',
  };

  const variantClass = variantClassMap[variant] || 'badge-primary';
  const pillClass = pill ? 'badge-pill' : 'rounded';

  return (
    <span
      className={`badge-base inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${variantClass} ${pillClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
