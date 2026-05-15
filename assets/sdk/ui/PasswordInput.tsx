import {
  type InputHTMLAttributes,
  type ReactNode,
  forwardRef,
  useState
} from 'react';

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    aria-hidden="true"
    className="tpa-w-5 tpa-h-5"
  >
    {open ? (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
        />
      </>
    ) : (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    )}
  </svg>
);

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, hint, error, className = '', ...rest }, ref) => {
    const [show, setShow] = useState(false);

    return (
      <div className="tpa-w-full">
        {label && (
          <label className="tpa-block tpa-text-sm tpa-font-medium tpa-text-slate-700 tpa-mb-1.5">
            {label}
          </label>
        )}
        <div className="tpa-relative">
          <input
            ref={ref}
            type={show ? 'text' : 'password'}
            className={[
              'tpa-w-full tpa-rounded-md tpa-border tpa-px-3 tpa-py-2.5 tpa-pr-10',
              'tpa-text-base tpa-placeholder-slate-400',
              'focus:tpa-outline-none focus-visible:tpa-ring-2',
              error
                ? 'tpa-border-red-500 focus-visible:tpa-ring-red-500'
                : 'tpa-border-slate-300 focus-visible:tpa-border-primary-500 focus-visible:tpa-ring-primary-500',
              className
            ]
              .filter(Boolean)
              .join(' ')}
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="tpa-absolute tpa-inset-y-0 tpa-right-0 tpa-flex tpa-items-center tpa-pr-3 tpa-text-slate-400 hover:tpa-text-slate-600"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={show} />
          </button>
        </div>
        {error && (
          <p className="tpa-mt-1.5 tpa-text-sm tpa-text-red-600" role="alert">
            {error}
          </p>
        )}
        {!error && hint && (
          <p className="tpa-mt-1.5 tpa-text-sm tpa-text-slate-500">{hint}</p>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
