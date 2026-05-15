import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useId
} from 'react';

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  error?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id: providedId, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    return (
      <div>
        <div className="tpa-flex tpa-items-start tpa-gap-2.5">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            className={`tpa-mt-0.5 tpa-w-4 tpa-h-4 tpa-rounded tpa-border-slate-300 tpa-text-primary-600 focus:tpa-ring-2 focus:tpa-ring-primary-500 focus:tpa-ring-offset-0 ${className}`}
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          {label && (
            <label
              htmlFor={id}
              className="tpa-text-sm tpa-text-slate-700 tpa-cursor-pointer tpa-leading-snug"
            >
              {label}
            </label>
          )}
        </div>
        {error && (
          <p
            className="tpa-mt-1 tpa-ml-6 tpa-text-sm tpa-text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
