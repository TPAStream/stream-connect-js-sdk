import { type ReactNode, useEffect, useState } from 'react';
import { getPolicyHolder } from '../services/requests';
import type { StreamPayer, StreamPolicyHolder } from '../types';
import { BackButton } from '../ui/BackButton';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Stack } from '../ui/Stack';
import { Text, Title } from '../ui/Title';
import {
  SEVERITY_BADGE_CLASSES,
  formatLastSynced,
  labelFor,
  severityFor
} from '../util/login-status';

interface PolicyHolderDetailProps {
  /** The PH selected from the fix-credentials list. Carries enough to
   * render the status header immediately (login_problem, username,
   * last_successful_crawl_end); the claim-count summary is fetched
   * lazily via getPolicyHolder. */
  policyHolder: StreamPolicyHolder;
  streamPayer: StreamPayer;
  email: string;
  employerId: number;
  /** True when this carrier authenticates via PAA (OAuth redirect)
   * rather than an inline credential form. Drives the edit-button copy
   * ("Reconnect" vs "Update sign-in info") — the reveal still hands off
   * to EnterCredentials, which routes to the InteroperabilityPayerForm
   * for PAA payers. */
  isInterop: boolean;
  /** Back to the fix-credentials carrier list. */
  returnToList: false | (() => void);
  /** Renders the credential / reconnect form when the user opts to edit.
   * `onBack` returns to this status view. Kept as a render-prop so all
   * the EnterCredentials wiring stays in the SDK controller where the
   * other props already live. */
  renderEditForm: (onBack: () => void) => ReactNode;
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
];

/** Format a bare ISO date (YYYY-MM-DD, the date_of_service the backend
 * sends) without going through `new Date()`, which would interpret the
 * string as UTC midnight and can render the previous day in a negative
 * timezone. Parse the components directly. */
const formatClaimDate = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const [, year, mo, day] = m;
  const monthName = MONTHS[Number(mo) - 1];
  if (!monthName) return null;
  return `${monthName} ${Number(day)}, ${year}`;
};

/** Show enough of the username to recognize the account without
 * printing the whole identifier on a connected-account screen. */
const maskUsername = (username: string): string => {
  if (!username) return '';
  // Mask short identifiers too (≤4 chars) — printing them whole defeats
  // the privacy goal on exactly the most compact account IDs. Keep the
  // first char as a recognition hint; a 1-char username is fully masked.
  if (username.length <= 4) {
    return username.length === 1
      ? '*'
      : `${username[0]}${'*'.repeat(username.length - 1)}`;
  }
  return `${username.slice(0, 4)}****`;
};

export const PolicyHolderDetail = (props: PolicyHolderDetailProps) => {
  const { policyHolder, streamPayer, isInterop, returnToList, renderEditForm } =
    props;

  const severity = severityFor(
    policyHolder.login_problem,
    policyHolder.last_successful_crawl_end
  );
  const healthy = severity === 'ok';

  // A broken / action-needed PH skips the status gate and opens straight
  // into the fix form (the member came here to repair it). A healthy PH
  // shows the read-only status first and gates the credential form behind
  // an explicit edit action.
  const [editing, setEditing] = useState(!healthy);

  // Lazily enrich with the claim-sync summary. The list PH doesn't carry
  // claims_synced_count / most_recent_claim_date; the single-PH GET does.
  const [summary, setSummary] = useState<{
    claimsSyncedCount: number | null;
    mostRecentClaimDate: string | null;
  } | null>(
    // Seed from the passed PH if the controller already had the full
    // shape (e.g. a fix-credentials reconnect that round-tripped GET).
    policyHolder.claims_synced_count !== undefined
      ? {
          claimsSyncedCount: policyHolder.claims_synced_count ?? null,
          mostRecentClaimDate: policyHolder.most_recent_claim_date ?? null
        }
      : null
  );

  useEffect(() => {
    let cancelled = false;
    // The summary only renders in the status-card view, so don't fetch it
    // when we open straight into the edit form (a broken PH, where
    // `editing` starts true). A healthy PH starts on the status card
    // (`editing` false) and fetches here; if the member later hits "Update
    // sign-in info" the fetch has already resolved, so there's no re-fetch
    // to gate — `editing` is captured at mount and the effect keys on
    // `policyHolder.id`.
    if (editing) return;
    // Only fetch when we don't already have the summary. The status
    // header renders from the list PH meanwhile, so a slow / failed
    // summary fetch never blocks the screen.
    if (summary !== null) return;
    getPolicyHolder({
      policyHolderId: policyHolder.id,
      email: props.email,
      employerId: props.employerId
    })
      .then((full) => {
        if (cancelled) return;
        setSummary({
          claimsSyncedCount: full.claims_synced_count ?? null,
          mostRecentClaimDate: full.most_recent_claim_date ?? null
        });
      })
      .catch(() => {
        // Non-fatal — leave the summary hidden. The connection status is
        // the primary signal; the claim counts are a nice-to-have audit
        // aid, not a reason to error the whole screen.
        if (!cancelled) {
          setSummary({ claimsSyncedCount: null, mostRecentClaimDate: null });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyHolder.id]);

  if (editing) {
    // Healthy PH → back returns to this status view. Broken PH started in
    // edit mode → back returns to the carrier list (its only sensible
    // target), matching the pre-0.8.2 behavior.
    return (
      <>
        {renderEditForm(
          healthy
            ? () => setEditing(false)
            : (returnToList as () => void) || (() => {})
        )}
      </>
    );
  }

  const badgeClass = SEVERITY_BADGE_CLASSES[severity];
  const statusLabel = labelFor(policyHolder.login_problem, severity);
  const lastSynced = policyHolder.last_successful_crawl_end
    ? formatLastSynced(policyHolder.last_successful_crawl_end)
    : null;
  const claimsCount = summary?.claimsSyncedCount ?? null;
  const recentClaim = formatClaimDate(summary?.mostRecentClaimDate);
  const logo = streamPayer.logo_url || policyHolder.payer?.logo_url;
  const name = streamPayer.name || policyHolder.payer?.name || 'Carrier';

  return (
    <Stack gap="md">
      {returnToList && <BackButton onClick={returnToList as () => void} />}
      <Card>
        <Stack gap="lg">
          <div className="tpa-flex tpa-items-center tpa-justify-between tpa-gap-3">
            <div className="tpa-flex tpa-items-center tpa-gap-3 tpa-min-w-0">
              {logo && (
                <img
                  src={logo}
                  alt=""
                  className="tpa-max-h-9 tpa-max-w-[120px] tpa-object-contain tpa-flex-shrink-0"
                />
              )}
              <Title order={3}>{name}</Title>
            </div>
            <span
              className={`tpa-text-xs tpa-font-medium tpa-rounded-full tpa-px-2 tpa-py-0.5 tpa-flex-shrink-0 ${badgeClass}`}
            >
              {statusLabel}
            </span>
          </div>

          {/* Connection facts. Username is hidden for PAA carriers (no
              inline credential — auth is the carrier OAuth grant). */}
          <Stack gap="xs">
            {!isInterop && policyHolder.username && (
              <div className="tpa-flex tpa-justify-between tpa-text-sm tpa-gap-3">
                <span className="tpa-text-slate-500">Username</span>
                <span className="tpa-text-slate-900 tpa-truncate">
                  {maskUsername(policyHolder.username)}
                </span>
              </div>
            )}
            {lastSynced && (
              <div className="tpa-flex tpa-justify-between tpa-text-sm tpa-gap-3">
                <span className="tpa-text-slate-500">Last synced</span>
                <span className="tpa-text-slate-900">{lastSynced}</span>
              </div>
            )}
          </Stack>

          {/* Claim-sync summary — aggregate audit signals only. No
              per-claim provider / amount / diagnosis is surfaced. */}
          {(claimsCount !== null || recentClaim) && (
            <div className="tpa-rounded-md tpa-bg-slate-50 tpa-p-3">
              <Stack gap="xs">
                {claimsCount !== null && (
                  <div className="tpa-flex tpa-justify-between tpa-text-sm tpa-gap-3">
                    <span className="tpa-text-slate-500">Claims synced</span>
                    <span className="tpa-font-medium tpa-text-slate-900">
                      {claimsCount.toLocaleString()}
                    </span>
                  </div>
                )}
                {recentClaim && (
                  <div className="tpa-flex tpa-justify-between tpa-text-sm tpa-gap-3">
                    <span className="tpa-text-slate-500">
                      Most recent claim
                    </span>
                    <span className="tpa-font-medium tpa-text-slate-900">
                      {recentClaim}
                    </span>
                  </div>
                )}
              </Stack>
            </div>
          )}

          <Button
            variant="secondary"
            fullWidth
            onClick={() => setEditing(true)}
          >
            {isInterop ? `Reconnect ${name}` : 'Update sign-in info'}
          </Button>
          {!isInterop && (
            <Text size="xs" color="muted" className="tpa-text-center">
              Your sign-in is connected. You only need to update it if your
              carrier password changed.
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};
