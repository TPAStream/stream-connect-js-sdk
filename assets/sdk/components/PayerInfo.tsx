import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useState } from 'react';
import { QuestionCircleIcon } from '../icons';
import type { StreamPayer } from '../types';
import { ConfirmDialog } from '../ui/Dialog';
import { IconButton } from '../ui/IconButton';
import { Group, Stack } from '../ui/Stack';
import { Text } from '../ui/Title';

interface PayerInfoProps {
  payer: StreamPayer;
  donePopUp?: () => void;
  includePayerBlogs?: boolean;
}

export const PayerInfo = ({
  payer,
  donePopUp,
  includePayerBlogs
}: PayerInfoProps) => {
  const [helpOpen, setHelpOpen] = useState(false);

  const message = `Before you proceed, make sure you have registered on ${payer.website_home_url_netloc} and have your ${payer.name} username and password ready.${
    payer.has_security_questions
      ? ` Also, have all ${payer.name} security questions and answers written down before you enroll below.`
      : ''
  }`;

  return (
    <Stack gap="md">
      <Group gap="md" align="start" justify="between">
        <Stack gap="sm">
          <img
            src={payer.logo_url}
            alt={payer.name}
            className="tpa-max-h-12 tpa-max-w-[180px] tpa-object-contain"
          />
          {payer.redirect_vendor_name && (
            <Text size="sm" color="muted">
              Powered by {payer.redirect_vendor_name}
            </Text>
          )}
        </Stack>
        <IconButton
          aria-label="Help getting started"
          onClick={() => {
            setHelpOpen(true);
            donePopUp?.();
          }}
        >
          <QuestionCircleIcon className="tpa-w-5 tpa-h-5" />
        </IconButton>
      </Group>

      <div className="tpa-rounded-md tpa-bg-amber-50 tpa-border tpa-border-amber-200 tpa-px-4 tpa-py-3 tpa-text-sm tpa-text-amber-800">
        {message}
      </div>

      {includePayerBlogs && payer.blogs && (
        <Stack gap="sm">
          {payer.blogs.map((blog, idx) => {
            // Force the sync return so we don't have to handle a
            // Promise here. marked v15's default is sync, but the
            // declared return type is `string | Promise<string>`
            // because async extensions exist. Pinning async:false
            // closes the type hole.
            const article = marked.parse(blog.article, { async: false });
            const clean = DOMPurify.sanitize(article);
            return (
              <div
                key={idx}
                className="tpa-prose tpa-prose-sm tpa-max-w-none tpa-text-slate-700"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized
                dangerouslySetInnerHTML={{ __html: clean }}
              />
            );
          })}
        </Stack>
      )}

      <ConfirmDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title="Help getting started"
        primaryLabel="Ok"
        secondaryLabel="Go to carrier site"
        onSecondary={() => {
          // noopener+noreferrer so the carrier page can't reach back
          // through window.opener to navigate the host site.
          window.open(payer.register_url, '_blank', 'noopener,noreferrer');
        }}
      >
        If you've not yet made an account with {payer.website_home_url_netloc},
        make one there first.
      </ConfirmDialog>
    </Stack>
  );
};
