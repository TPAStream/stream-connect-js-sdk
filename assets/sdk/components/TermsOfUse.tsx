import DOMPurify from 'dompurify';
import { useEffect } from 'react';
import { Button } from '../ui/Button';
import { Stack } from '../ui/Stack';
import { Title } from '../ui/Title';

interface TermsOfUseProps {
  termsHtmlString: string;
  onClose: () => void;
  doneTermsOfService?: () => void;
}

export const TermsOfUse = ({
  termsHtmlString,
  onClose,
  doneTermsOfService
}: TermsOfUseProps) => {
  useEffect(() => {
    doneTermsOfService?.();
  }, [doneTermsOfService]);

  // The terms HTML comes from sdk-api/terms_of_service which is
  // tenant-controlled. We sanitize defensively at render time so a
  // misconfigured tenant can't inject script tags into the host page.
  const safeHtml = DOMPurify.sanitize(termsHtmlString || '');

  return (
    <Stack gap="lg">
      <Title order={2}>Terms of Use</Title>
      <div
        className="tpa-prose tpa-prose-sm tpa-max-w-none tpa-text-slate-700"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized above
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
      <Button variant="secondary" onClick={onClose}>
        Return to form
      </Button>
    </Stack>
  );
};
