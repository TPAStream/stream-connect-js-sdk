import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';
import { SpinnerIcon } from '../icons';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'tpa-bg-primary-600 tpa-text-white hover:tpa-bg-primary-700 disabled:tpa-bg-primary-600/50',
  secondary:
    'tpa-bg-white tpa-text-slate-700 tpa-border tpa-border-slate-300 hover:tpa-bg-slate-50 disabled:tpa-bg-slate-50',
  ghost:
    'tpa-bg-transparent tpa-text-slate-600 hover:tpa-bg-slate-100 disabled:tpa-text-slate-400',
  link: 'tpa-bg-transparent tpa-text-primary-600 hover:tpa-text-primary-700 hover:tpa-underline disabled:tpa-text-slate-400 tpa-px-0 tpa-py-0'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'tpa-text-sm tpa-px-3 tpa-py-1.5',
  md: 'tpa-text-base tpa-px-4 tpa-py-2.5',
  lg: 'tpa-text-base tpa-px-5 tpa-py-3 tpa-font-medium'
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const classes = [
      'tpa-inline-flex tpa-items-center tpa-justify-center tpa-gap-2',
      'tpa-rounded-md tpa-font-medium tpa-transition-colors',
      'focus:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500 focus-visible:tpa-ring-offset-2',
      'disabled:tpa-cursor-not-allowed',
      variantClasses[variant],
      variant !== 'link' ? sizeClasses[size] : '',
      fullWidth ? 'tpa-w-full' : '',
      className
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || loading}
        {...rest}
      >
        {loading ? (
          <SpinnerIcon className="tpa-w-4 tpa-h-4" />
        ) : (
          leftIcon && <span className="tpa-inline-flex">{leftIcon}</span>
        )}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className="tpa-inline-flex">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
