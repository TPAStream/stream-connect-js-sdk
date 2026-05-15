import { ArrowLeftIcon } from '../icons';

interface BackButtonProps {
  onClick: () => void;
  /** Override the visible label. Defaults to "Back". */
  label?: string;
}

/**
 * A clearly labeled back button. The icon-only IconButton variant we
 * shipped first wasn't visually obvious as a navigation control on the
 * step screens (back-arrow-in-a-circle reads as "decoration" to a lot
 * of users). This component pairs the chevron with the word "Back" in
 * a ghost-styled button so the affordance is unambiguous, while still
 * being subtle enough not to compete with the primary action.
 */
export const BackButton = ({ onClick, label = 'Back' }: BackButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tpa-inline-flex tpa-items-center tpa-gap-2.5 tpa-text-base tpa-font-medium tpa-text-primary-700 hover:tpa-text-primary-800 tpa-px-6 tpa-py-2.5 tpa-rounded-md tpa-bg-primary-50 hover:tpa-bg-primary-100 tpa-border tpa-border-primary-200 hover:tpa-border-primary-300 focus:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500 tpa-transition-colors tpa-self-start"
    >
      <ArrowLeftIcon className="tpa-w-5 tpa-h-5" />
      <span>{label}</span>
    </button>
  );
};
