import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for a11y — describes the action. */
  'aria-label': string;
  children: ReactNode;
}

export const IconButton = ({
  className = '',
  children,
  type = 'button',
  ...rest
}: IconButtonProps) => {
  return (
    <button
      type={type}
      className={`tpa-inline-flex tpa-items-center tpa-justify-center tpa-w-9 tpa-h-9 tpa-rounded-full tpa-text-slate-500 hover:tpa-bg-slate-100 hover:tpa-text-slate-700 focus:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
