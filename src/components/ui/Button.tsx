import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold-primary' | 'secondary' | 'outline' | 'gold-outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  pill?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  pill = false,
  loading = false,
  className = '',
  disabled,
  children,
  ...props
}) => {
  const variantClassMap: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'btn-primary',
    'gold-primary': 'btn-gold-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    'gold-outline': 'btn-gold-outline',
    ghost: 'btn-ghost',
    destructive: 'btn-destructive',
    link: 'btn-link',
  };

  const sizeClassMap: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    icon: 'btn-icon',
  };

  const variantClass = variantClassMap[variant] || 'btn-primary';
  const sizeClass = sizeClassMap[size] || 'btn-md';
  const pillClass = pill ? 'btn-pill' : '';
  const loadingClass = loading ? 'btn-loading' : '';

  return (
    <button
      className={`btn-base ${variantClass} ${sizeClass} ${pillClass} ${loadingClass} ${className}`.trim()}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
};

