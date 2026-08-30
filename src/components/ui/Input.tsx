import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: 'default' | 'error' | 'success';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  showPasswordToggle?: boolean;
  /** Render a <textarea> instead of an <input> when true. */
  multiline?: boolean;
  rows?: number;
}

export const Input = React.forwardRef<HTMLElement, InputProps>(
  ({ variant = 'default', className = '', disabled, icon, iconPosition = 'left', showPasswordToggle, type, multiline, rows, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const effectiveType = isPassword && showPassword ? 'text' : type;

    const variantClass = variant === 'error' 
      ? 'input-error' 
      : variant === 'success' 
      ? 'input-success' 
      : 'input-default';

    const disabledClass = disabled ? 'input-disabled' : '';

    const paddingClass = icon
      ? iconPosition === 'left'
        ? 'pl-9'
        : 'pr-9'
      : '';

    const togglePadding = showPasswordToggle && isPassword ? 'pr-10' : '';

    const classes = `input-base ${variantClass} ${disabledClass} w-full ${paddingClass} ${togglePadding} ${className}`.trim();

    // Textarea rendering
    if (multiline) {
      return (
        <div className="relative w-full">
          {icon && iconPosition === 'left' && (
            <span className="absolute left-3 top-3 flex items-center text-muted-foreground pointer-events-none">
              {icon}
            </span>
          )}
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            disabled={disabled}
            rows={rows ?? 3}
            className={classes}
            {...(props as unknown as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
          {icon && iconPosition === 'right' && (
            <span className="absolute right-3 top-3 flex items-center text-muted-foreground pointer-events-none">
              {icon}
            </span>
          )}
        </div>
      );
    }

    // Input rendering
    return (
      <div className="relative w-full gap-4">
        {/* {icon && iconPosition === 'right' && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground pointer-events-none">
            {icon}
          </span>
        )} */}
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          disabled={disabled}
          type={effectiveType}
          className={classes}
          {...props}
        />
        {icon && iconPosition === 'right' && !(showPasswordToggle && isPassword) && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground pointer-events-none">
            {icon}
          </span>
        )}
        {showPasswordToggle && isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(prev => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';