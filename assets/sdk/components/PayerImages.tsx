import { useMemo, useState } from 'react';
import { useActiveValidations } from '../contexts/ActiveValidationsContext';
import { SpinnerIcon } from '../icons';
import {
  CRITICAL_LOGIN_PROBLEMS,
  type StreamPayer,
  type StreamPolicyHolderShort,
  VALID_LOGIN_PROBLEMS,
  WARNING_LOGIN_PROBLEMS
} from '../types';

/**
 * Render-friendly mapping of login_problem enum values. Anything not
 * listed falls through to the raw key (uppercased) — fine for an
 * edge case the SDK might not know about, less ugly than displaying
 * the literal SQL value.
 */
const LOGIN_PROBLEM_LABELS: Record<string, string> = {
  invalid: 'Wrong username or password',
  invalid_username_format: "Username format isn't accepted",
  locked: 'Carrier account locked',
  broken: 'Carrier account closed or moved',
  invalid_interop_token: 'Connection expired',
  incomplete: 'Missing some required info',
  needs_two_factor: 'Two-factor verification needed',
  sec_question: 'Security question needs an answer',
  wrong_secondary: 'Wrong security answer',
  mfa_carrier: 'Carrier sent a verification code',
  migrating: 'Carrier is changing platforms'
};

const formatLastSynced = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.round(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo === 1 ? '' : 's'} ago`;
};

type Severity = 'critical' | 'warning' | 'ok';

const severityFor = (
  loginProblem: string | null,
  lastSyncIso: string | null | undefined
): Severity => {
  if (!loginProblem) return 'ok';
  if (CRITICAL_LOGIN_PROBLEMS.has(loginProblem)) {
    return 'critical';
  }
  if (WARNING_LOGIN_PROBLEMS.has(loginProblem)) {
    // A recent successful sync downgrades warning to ok visually:
    // the carrier is still pulling claims, the user just has an
    // outstanding action item (often dismissable for that PH alone).
    if (lastSyncIso) {
      const ageMs = Date.now() - new Date(lastSyncIso).getTime();
      if (ageMs < 7 * 24 * 60 * 60 * 1000) return 'ok';
    }
    return 'warning';
  }
  // Backend-accepted "this carrier is fine" enum values that aren't in
  // the warning or critical sets (`valid`, `inactive`). Render as ok
  // — they're explicit signals, not unknowns. (Most of the WARNING
  // values are also in VALID_LOGIN_PROBLEMS because they're "valid
  // creds but the user still needs to do something"; those got caught
  // above and don't reach here.)
  if (VALID_LOGIN_PROBLEMS.has(loginProblem)) {
    return 'ok';
  }
  // An unknown non-null login_problem (e.g. a new enum value the
  // backend added before the SDK was bumped) is treated as `warning`
  // rather than `ok`. Showing "Action needed" with the raw problem
  // string (via labelFor) is the safe fail-forward: a member who
  // genuinely has a fixable issue won't be lulled into believing the
  // connection is healthy. Pre-c5f9da0 this returned `ok` for unknowns,
  // which hid real action items.
  return 'warning';
};

interface PayerImagesProps {
  streamPayers: StreamPayer[];
  usedPayers: number[];
  choosePayer: (args: { payer: StreamPayer; dependent: boolean }) => void;
}

/**
 * How many tiles to render before collapsing the rest behind a
 * "Show all N carriers" expander. Real-world employer payer counts:
 * p50=1, p90=3, p99=12, max=19 (per the dev DB snapshot 2026-05-15),
 * so 6 fully renders the typical case (≥90% of employers) while
 * keeping rare large-cardinality lists from turning the page into a
 * tall scroll.
 */
const TILE_COLLAPSE_THRESHOLD = 6;

const PayerTile = ({
  payer,
  dependent,
  onClick
}: {
  payer: StreamPayer;
  dependent: boolean;
  onClick: () => void;
}) => {
  return (
    <button
      type="button"
      id={`selectPayer_${payer.id}`}
      onClick={onClick}
      className="tpa-flex tpa-items-center tpa-justify-between tpa-w-full tpa-bg-white tpa-rounded-lg tpa-shadow-card hover:tpa-shadow-card-hover tpa-border tpa-border-slate-200 tpa-p-4 tpa-transition-shadow focus:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500"
    >
      <div className="tpa-flex tpa-items-center tpa-gap-4 tpa-min-w-0">
        <img
          src={payer.logo_url}
          alt=""
          className="tpa-max-h-10 tpa-max-w-[140px] tpa-object-contain tpa-flex-shrink-0"
        />
        <div className="tpa-flex tpa-flex-col tpa-min-w-0 tpa-text-left">
          <span className="tpa-font-medium tpa-text-slate-800 tpa-truncate">
            {payer.name}
          </span>
          {dependent && (
            <span className="tpa-text-xs tpa-text-slate-500">
              Add a dependent login
            </span>
          )}
        </div>
      </div>
      <span className="tpa-text-primary-600 tpa-text-sm tpa-font-medium tpa-flex-shrink-0 tpa-ml-3">
        Connect →
      </span>
    </button>
  );
};

export const PayerImages = ({
  streamPayers,
  usedPayers,
  choosePayer
}: PayerImagesProps) => {
  const [expanded, setExpanded] = useState(false);
  const overflows = streamPayers.length > TILE_COLLAPSE_THRESHOLD;
  const visible =
    overflows && !expanded
      ? streamPayers.slice(0, TILE_COLLAPSE_THRESHOLD)
      : streamPayers;
  const hiddenCount = streamPayers.length - TILE_COLLAPSE_THRESHOLD;

  return (
    <div id="payer-images" className="tpa-flex tpa-flex-col tpa-gap-3">
      {visible.map((payer) => {
        const dependent = usedPayers.includes(payer.id);
        return (
          <PayerTile
            key={`selectPayer_${payer.id}`}
            payer={payer}
            dependent={dependent}
            onClick={() => choosePayer({ payer, dependent })}
          />
        );
      })}
      {overflows && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="tpa-text-sm tpa-font-medium tpa-text-primary-600 hover:tpa-text-primary-700 tpa-py-2 tpa-px-3 tpa-self-center focus:tpa-outline-none focus-visible:tpa-ring-2 focus-visible:tpa-ring-primary-500 tpa-rounded-md"
        >
          + Show all {streamPayers.length} carriers
          <span className="tpa-text-slate-500 tpa-font-normal">
            {' '}
            ({hiddenCount} more)
          </span>
        </button>
      )}
    </div>
  );
};

/**
 * Resolve which payer a PolicyHolder belongs to. Migrating PHs point
 * at the OLD carrier; the destination is the new one that shares the
 * same `payer_group_id`. Resolve against the group, and explicitly
 * skip the PH's own dead `payer_id` so we don't bounce back to the
 * source when both source and destination happen to be in the
 * employer's enabled-carriers list during the migration window.
 */
export const resolvePayerForPH = (
  ph: StreamPolicyHolderShort,
  payers: StreamPayer[]
): StreamPayer | undefined => {
  if (
    ph.login_problem === 'migrating' &&
    ph.payer &&
    ph.payer.payer_group_id !== null &&
    ph.payer.payer_group_id !== undefined
  ) {
    return payers.find(
      (p) =>
        ph.payer?.payer_group_id === p.payer_group_id && p.id !== ph.payer_id
    );
  }
  return payers.find((p) => ph.payer_id === p.id);
};

interface FixPayerImagesProps {
  policyHolders: StreamPolicyHolderShort[];
  payers: StreamPayer[];
  choosePolicyHolder: (args: {
    policyHolder?: StreamPolicyHolderShort;
    payer?: StreamPayer;
    dependent?: boolean;
  }) => void;
}

const SEVERITY_TILE_CLASSES: Record<Severity, string> = {
  critical:
    'tpa-bg-red-50 tpa-border-red-200 hover:tpa-shadow-card-hover tpa-cursor-pointer',
  warning:
    'tpa-bg-amber-50 tpa-border-amber-200 hover:tpa-shadow-card-hover tpa-cursor-pointer',
  ok: 'tpa-bg-white tpa-border-slate-200 hover:tpa-shadow-card-hover tpa-cursor-pointer'
};

const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  critical: 'tpa-bg-red-100 tpa-text-red-800',
  warning: 'tpa-bg-amber-100 tpa-text-amber-800',
  ok: 'tpa-bg-emerald-100 tpa-text-emerald-800'
};

const labelFor = (
  loginProblem: string | null,
  severity: 'critical' | 'warning' | 'ok'
): string => {
  // Healthy PHs (no problem, OR a warning-class problem with a recent
  // successful sync that downgraded it to 'ok') read as "Connected".
  if (severity === 'ok') return 'Connected';
  if (!loginProblem) return 'Action needed';
  return LOGIN_PROBLEM_LABELS[loginProblem] || loginProblem.replace(/_/g, ' ');
};

export const FixPayerImages = ({
  policyHolders,
  payers,
  choosePolicyHolder
}: FixPayerImagesProps) => {
  const { validations } = useActiveValidations();
  // Only count validations whose UX state is genuinely mid-flight
  // (the user is still waiting on a server response). Once a
  // validation transitions to success/failure/pending_async the tile
  // should drop the "Validating now" badge and unforce the severity
  // override; otherwise a failed submit leaves the tile stuck on
  // "Validating now" with ok severity even though the hero + panel
  // both show "Couldn't connect". The SDK's terminal-refresh effect
  // updates streamUser.policy_holders right after the failure lands,
  // so the tile's real severity / label come from the refreshed PH.
  const inFlightByPhId = useMemo(() => {
    const m = new Map<number, (typeof validations)[number]>();
    for (const validation of validations) {
      if (
        validation.state === 'pending' ||
        validation.state === 'method_choice' ||
        validation.state === 'awaiting_code' ||
        validation.state === 'submitting'
      ) {
        m.set(validation.policyHolderId, validation);
      }
    }
    return m;
  }, [validations]);

  // Sort priority:
  //   1. In-flight validations first (user just submitted)
  //   2. Critical-broken PHs next (need attention now)
  //   3. Warning PHs after (needs attention but not critical)
  //   4. Healthy PHs last, by most recent successful sync desc
  const severityRank = (sev: 'critical' | 'warning' | 'ok'): number =>
    sev === 'critical' ? 2 : sev === 'warning' ? 1 : 0;
  const sortedPhs = useMemo(() => {
    return [...policyHolders].sort((a, b) => {
      const aInFlight = inFlightByPhId.has(a.id) ? 1 : 0;
      const bInFlight = inFlightByPhId.has(b.id) ? 1 : 0;
      if (aInFlight !== bInFlight) return bInFlight - aInFlight;
      const aSev = severityRank(
        severityFor(a.login_problem, a.last_successful_crawl_end)
      );
      const bSev = severityRank(
        severityFor(b.login_problem, b.last_successful_crawl_end)
      );
      if (aSev !== bSev) return bSev - aSev;
      const aSync = a.last_successful_crawl_end
        ? Date.parse(a.last_successful_crawl_end)
        : 0;
      const bSync = b.last_successful_crawl_end
        ? Date.parse(b.last_successful_crawl_end)
        : 0;
      return bSync - aSync;
    });
  }, [policyHolders, inFlightByPhId]);

  return (
    <div id="payer-images" className="tpa-flex tpa-flex-col tpa-gap-3">
      {sortedPhs.map((ph) => {
        const resolved = resolvePayerForPH(ph, payers);
        const disabled = !resolved;
        const logo = resolved?.logo_url || ph.payer?.logo_url;
        const name = resolved?.name || ph.payer?.name || 'Carrier';
        const inFlight = inFlightByPhId.get(ph.id);
        const severity = inFlight
          ? 'ok'
          : severityFor(ph.login_problem, ph.last_successful_crawl_end);
        const lastSyncRel = ph.last_successful_crawl_end
          ? formatLastSynced(ph.last_successful_crawl_end)
          : null;
        return (
          <div
            key={`selectPh_${ph.id}`}
            id={`selectPh_${ph.id}`}
            className={`tpa-rounded-lg tpa-border tpa-p-4 tpa-shadow-card ${disabled ? 'tpa-bg-slate-50 tpa-border-slate-200 tpa-opacity-70 tpa-cursor-not-allowed' : SEVERITY_TILE_CLASSES[severity]}`}
            onClick={() => {
              if (disabled || !resolved) return;
              if (ph.login_problem === 'migrating') {
                choosePolicyHolder({ payer: resolved, dependent: false });
              } else {
                choosePolicyHolder({ policyHolder: ph, payer: resolved });
              }
            }}
            onKeyDown={(e) => {
              if (disabled || !resolved) return;
              if (e.key === 'Enter' || e.key === ' ') {
                // Space on a div[role=button] would otherwise scroll
                // the host page while activating the tile. Native
                // <button> handles this automatically; for our div
                // proxy we have to opt in.
                e.preventDefault();
                if (ph.login_problem === 'migrating') {
                  choosePolicyHolder({ payer: resolved, dependent: false });
                } else {
                  choosePolicyHolder({ policyHolder: ph, payer: resolved });
                }
              }
            }}
            role={disabled ? undefined : 'button'}
            tabIndex={disabled ? undefined : 0}
          >
            <div className="tpa-flex tpa-items-center tpa-justify-between tpa-gap-3">
              <div className="tpa-flex tpa-items-center tpa-gap-3 tpa-min-w-0">
                {logo && (
                  <img
                    src={logo}
                    alt=""
                    className={`tpa-max-w-[4rem] tpa-max-h-8 tpa-flex-shrink-0 ${disabled ? 'tpa-opacity-50' : ''}`}
                  />
                )}
                <span className="tpa-font-semibold tpa-text-slate-900 tpa-truncate">
                  {name}
                </span>
              </div>
              {!disabled && (
                <span
                  className={`tpa-text-xs tpa-font-medium tpa-rounded-full tpa-px-2 tpa-py-0.5 tpa-inline-flex tpa-items-center tpa-gap-1 ${
                    inFlight
                      ? 'tpa-bg-primary-100 tpa-text-primary-800'
                      : SEVERITY_BADGE_CLASSES[severity]
                  }`}
                >
                  {inFlight && <SpinnerIcon className="tpa-w-3 tpa-h-3" />}
                  {inFlight
                    ? 'Validating now'
                    : labelFor(ph.login_problem, severity)}
                </span>
              )}
            </div>
            <div className="tpa-mt-2 tpa-flex tpa-items-center tpa-justify-between tpa-text-sm tpa-gap-3">
              <div className="tpa-min-w-0 tpa-truncate">
                <span className="tpa-text-slate-500">User: </span>
                <span className="tpa-text-slate-900">{ph.username}</span>
              </div>
              {lastSyncRel && (
                <span className="tpa-text-xs tpa-text-slate-500 tpa-flex-shrink-0">
                  Last synced {lastSyncRel}
                </span>
              )}
            </div>
            {disabled && (
              <div className="tpa-mt-2 tpa-text-sm tpa-text-slate-500">
                This carrier isn't enabled for this employer. Please contact
                your administrator.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
