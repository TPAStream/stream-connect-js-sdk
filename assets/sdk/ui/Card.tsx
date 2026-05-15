import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** When true, the card gets the hover-elevated treatment. */
  interactive?: boolean;
  /** When true, dim the card and disable pointer events. */
  disabled?: boolean;
  /** Optional header content rendered above the body. */
  header?: ReactNode;
  /** Optional footer content rendered below the body. */
  footer?: ReactNode;
}

export const Card = ({
  interactive,
  disabled,
  header,
  footer,
  className = '',
  children,
  ...rest
}: CardProps) => {
  const classes = [
    'tpa-bg-white tpa-rounded-lg tpa-shadow-card tpa-border tpa-border-slate-200',
    interactive
      ? 'hover:tpa-shadow-card-hover tpa-transition-shadow tpa-cursor-pointer'
      : '',
    disabled ? 'tpa-opacity-55 tpa-pointer-events-none' : '',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...rest}>
      {header && (
        <div className="tpa-px-5 tpa-pt-5 tpa-pb-3 tpa-border-b tpa-border-slate-100">
          {header}
        </div>
      )}
      <div className="tpa-p-5">{children}</div>
      {footer && (
        <div className="tpa-px-5 tpa-py-3 tpa-bg-slate-50 tpa-rounded-b-lg tpa-border-t tpa-border-slate-100">
          {footer}
        </div>
      )}
    </div>
  );
};
