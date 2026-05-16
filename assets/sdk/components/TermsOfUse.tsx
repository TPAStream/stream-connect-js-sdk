import DOMPurify from 'dompurify';
import { useEffect } from 'react';
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

  return (
    <Dialog open={open} onClose={onClose} title="Terms of Use">
      <div
        className="tpa-prose tpa-prose-sm tpa-max-w-none tpa-text-slate-700 tpa-max-h-[60vh] tpa-overflow-y-auto"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized above
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    </Dialog>
  );
};
