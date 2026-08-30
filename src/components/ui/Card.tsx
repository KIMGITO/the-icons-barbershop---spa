import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'interactive';
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const variantClassMap: Record<NonNullable<CardProps['variant']>, string> = {
    default: 'card-default',
    elevated: 'card-elevated',
    bordered: 'card-bordered',
    interactive: 'card-interactive',
  };

  const variantClass = variantClassMap[variant] || 'card-default';

  return (
    <div className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
