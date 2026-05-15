import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useId
} from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leftSection?: ReactNode;
  rightSection?: ReactNode;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      hint,
      error,
      leftSection,
      rightSection,
      id: providedId,
      className = '',
      type = 'text',
      ...rest
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;

    const inputClasses = [
      'tpa-w-full tpa-rounded-md tpa-border tpa-px-3 tpa-py-2.5',
      'tpa-text-base tpa-placeholder-slate-400',
      'focus:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-offset-0',
      error
        ? 'tpa-border-red-500 focus-visible:tpa-ring-red-500'
        : 'tpa-border-slate-300 focus-visible:tpa-border-primary-500 focus-visible:tpa-ring-primary-500',
      leftSection ? 'tpa-pl-10' : '',
      rightSection ? 'tpa-pr-10' : '',
      className
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="tpa-w-full">
        {label && (
          <label
            htmlFor={id}
            className="tpa-block tpa-text-sm tpa-font-medium tpa-text-slate-700 tpa-mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="tpa-relative">
          {leftSection && (
            <div className="tpa-absolute tpa-inset-y-0 tpa-left-0 tpa-flex tpa-items-center tpa-pl-3 tpa-text-slate-400 tpa-pointer-events-none">
              {leftSection}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            type={type}
            className={inputClasses}
            aria-describedby={
              [hintId, errorId].filter(Boolean).join(' ') || undefined
            }
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          {rightSection && (
            <div className="tpa-absolute tpa-inset-y-0 tpa-right-0 tpa-flex tpa-items-center tpa-pr-3 tpa-text-slate-400">
              {rightSection}
            </div>
          )}
        </div>
        {error && (
          <p
            id={errorId}
            className="tpa-mt-1.5 tpa-text-sm tpa-text-red-600"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={hintId} className="tpa-mt-1.5 tpa-text-sm tpa-text-slate-500">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

TextInput.displayName = 'TextInput';
