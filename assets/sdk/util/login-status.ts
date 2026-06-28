import {
  CRITICAL_LOGIN_PROBLEMS,
  VALID_LOGIN_PROBLEMS,
  WARNING_LOGIN_PROBLEMS
} from '../types';

/**
 * Shared login-status presentation helpers. These map the backend
 * `login_problem` enum (plus the most-recent successful sync time)
 * onto the severity / label / relative-time vocabulary the SDK
 * renders in both the fix-credentials carrier list (PayerImages) and
 * the per-policy-holder status detail (PolicyHolderDetail). Kept in
 * one place so the two surfaces can never drift on what counts as
 * "Connected" vs "Action needed".
 */

/**
 * Render-friendly mapping of login_problem enum values. Anything not
 * listed falls through to the raw key (uppercased) — fine for an
 * edge case the SDK might not know about, less ugly than displaying
 * the literal SQL value.
 */
export const LOGIN_PROBLEM_LABELS: Record<string, string> = {
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

export const formatLastSynced = (iso: string): string => {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  // Floor, not round: a bucket should only advance once it's fully
  // elapsed (31s is "just now", not "1 min ago"; 89m is "1 hour ago",
  // not "2 hours ago").
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.floor(d / 30);
  return `${mo} month${mo === 1 ? '' : 's'} ago`;
};

export type Severity = 'critical' | 'warning' | 'ok';

export const severityFor = (
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

export const labelFor = (
  loginProblem: string | null,
  severity: Severity
): string => {
  // Healthy PHs (no problem, OR a warning-class problem with a recent
  // successful sync that downgraded it to 'ok') read as "Connected".
  if (severity === 'ok') return 'Connected';
  if (!loginProblem) return 'Action needed';
  return LOGIN_PROBLEM_LABELS[loginProblem] || loginProblem.replace(/_/g, ' ');
};

export const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  critical: 'tpa-bg-red-100 tpa-text-red-800',
  warning: 'tpa-bg-amber-100 tpa-text-amber-800',
  ok: 'tpa-bg-emerald-100 tpa-text-emerald-800'
};

export const SEVERITY_TILE_CLASSES: Record<Severity, string> = {
  critical:
    'tpa-bg-red-50 tpa-border-red-200 hover:tpa-shadow-card-hover tpa-cursor-pointer',
  warning:
    'tpa-bg-amber-50 tpa-border-amber-200 hover:tpa-shadow-card-hover tpa-cursor-pointer',
  ok: 'tpa-bg-white tpa-border-slate-200 hover:tpa-shadow-card-hover tpa-cursor-pointer'
};
