import type { ReactNode } from 'react';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: ReactNode;
  children?: ReactNode;
}

const variantClasses: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'tpa-bg-primary-50 tpa-border-primary-200 tpa-text-primary-700',
  success: 'tpa-bg-emerald-50 tpa-border-emerald-200 tpa-text-emerald-700',
  warning: 'tpa-bg-amber-50 tpa-border-amber-200 tpa-text-amber-700',
  danger: 'tpa-bg-red-50 tpa-border-red-200 tpa-text-red-700'
};

export const Alert = ({ variant = 'info', title, children }: AlertProps) => {
  return (
    <div
      className={`tpa-rounded-md tpa-border tpa-px-4 tpa-py-3 tpa-text-sm ${variantClasses[variant]}`}
      role={variant === 'danger' ? 'alert' : 'status'}
    >
      {title && <p className="tpa-font-medium">{title}</p>}
      {children && <div className={title ? 'tpa-mt-1' : ''}>{children}</div>}
    </div>
  );
};
