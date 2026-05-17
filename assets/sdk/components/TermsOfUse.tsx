import DOMPurify from 'dompurify';
import { useEffect } from 'react';
import { SpinnerIcon } from '../icons';
import { Dialog } from '../ui/Dialog';

interface TermsOfUseProps {
  /** Controls visibility. When false, the Dialog is unmounted. */
  open: boolean;
  termsHtmlString: string;
  onClose: () => void;
  doneTermsOfService?: () => void;
}

/**
 * Renders the tenant terms-of-service as a scrollable modal overlay so
 * the credentials form behind it stays mounted (user's typed inputs +
 * checkbox state survive without a formData round trip). 0.7.x used a
 * full-screen replacement; that broke flow the moment the user came
 * back, since the form had to be re-hydrated from saved state.
 */
export const TermsOfUse = ({
  open,
  termsHtmlString,
  onClose,
  doneTermsOfService
}: TermsOfUseProps) => {
  useEffect(() => {
    if (open) doneTermsOfService?.();
  }, [open, doneTermsOfService]);

  // The terms HTML comes from sdk-api/terms_of_service which is
  // tenant-controlled. We sanitize defensively at render time so a
  // misconfigured tenant can't inject script tags into the host page.
  const safeHtml = DOMPurify.sanitize(termsHtmlString || '');

  // When the overlay opens before the terms HTML has finished
  // fetching (the SDK opens the Dialog immediately to keep the
  // credentials form mounted behind it), render a centered spinner
  // until the HTML lands. Avoids a one-frame empty-modal flash.
  return (
    <Dialog open={open} onClose={onClose} title="Terms of Use">
      {safeHtml ? (
        <div
          className="tpa-prose tpa-prose-sm tpa-max-w-none tpa-text-slate-700 tpa-max-h-[60vh] tpa-overflow-y-auto"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized above
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <div className="tpa-flex tpa-items-center tpa-justify-center tpa-py-12">
          <SpinnerIcon className="tpa-w-8 tpa-h-8 tpa-text-primary-600" />
        </div>
      )}
    </Dialog>
  );
};
