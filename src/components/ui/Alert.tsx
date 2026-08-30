import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const variantClassMap: Record<NonNullable<AlertProps['variant']>, string> = {
    default: 'alert-default',
    success: 'alert-success',
    warning: 'alert-warning',
    destructive: 'alert-destructive',
    info: 'alert-info',
  };

  const variantClass = variantClassMap[variant] || 'alert-default';

  return (
    <div role="alert" className={`${variantClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};
