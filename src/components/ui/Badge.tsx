import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'gold' | 'success' | 'warning' | 'destructive' | 'info' | 'neutral';
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
    gold: 'badge-gold',
    success: 'badge-success',
    warning: 'badge-warning',
    destructive: 'badge-destructive',
    info: 'badge-info',
    neutral: 'badge-neutral',
  };

  const variantClass = variantClassMap[variant] || 'badge-primary';
  const pillClass = pill ? 'badge-pill' : '';

  return (
    <span
      className={`badge-base ${variantClass} ${pillClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </span>
  );
};
