import { type Root, createRoot } from 'react-dom/client';
import { SDK } from '../components/SDK';
import { ActiveValidationsProvider } from '../contexts/ActiveValidationsContext';
import { ThemeProvider } from '../theme/theme';
import type { SDKInitOptions } from '../types-init';
// NOTE: the tailwind stylesheet import lives in the `sdk.tsx` thin
// wrapper (the styled-bundle entry), NOT here. The headless entry
// (`sdk-headless.tsx`) re-exports this same core without the
// stylesheet so customers driving their own UI via the renderXxx
// callbacks aren't forced to ship our ~50 KB of Tailwind output.

const VERSION = '0.8.0';

// Track one React root per container element. Some host pages call
// StreamConnect() more than once against the same `el` (e.g. on a
// route change, after toggling visibility, or with new user/employer
// after the host's auth state changes). createRoot on an already-mounted
// container is a React 19 hard warning AND leaks the old root, so we
// explicitly unmount the previous root and create a fresh one. Reusing
// the cached root would let the SDK's `initialized.current` guard keep
// the previous session's wizard state and active validations alive
// across what the customer expects to be a clean re-init.
const rootCache = new WeakMap<Element, Root>();

const onDOMReady = (cb: () => void) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cb, { once: true });
  } else {
    cb();
  }
};

/**
 * Translate deprecated init() option names to their canonical form.
 * Logs a one-time warning per legacy key so customers see a console
 * deprecation notice but the SDK continues to behave correctly.
 *
 * Aliases (legacy -> canonical, indefinite support):
 *   enableInterop            -> enablePatientAccessAPI
 *   enableInteropSinglePage  -> enablePatientAccessAPISinglePage
 */
const warnedKeys = new Set<string>();
const warnDeprecation = (legacy: string, canonical: string) => {
  if (warnedKeys.has(legacy)) return;
  warnedKeys.add(legacy);
  console.warn(
    `[stream-connect-sdk] Init option "${legacy}" is deprecated; use "${canonical}" instead. The legacy name will keep working indefinitely.`
  );
};

const normalizeOptions = (opts: SDKInitOptions): SDKInitOptions => {
  const out: SDKInitOptions = { ...opts };
  if (
    opts.enableInterop !== undefined &&
    opts.enablePatientAccessAPI === undefined
  ) {
    warnDeprecation('enableInterop', 'enablePatientAccessAPI');
    out.enablePatientAccessAPI = opts.enableInterop;
  }
  if (
    opts.enableInteropSinglePage !== undefined &&
    opts.enablePatientAccessAPISinglePage === undefined
  ) {
    warnDeprecation(
      'enableInteropSinglePage',
      'enablePatientAccessAPISinglePage'
    );
    out.enablePatientAccessAPISinglePage = opts.enableInteropSinglePage;
  }
  // `fixCredentials` is deprecated in 0.8: the SDK now derives
  // member-portal mode from `connectAccessToken` presence, which was
  // already the de-facto gate (the backend `/sdk-api/fix-credentials`
  // endpoint requires a connect access token, so there was never a
  // valid `fixCredentials: true` without one). The legacy flag is
  // accepted but ignored.
  if (opts.fixCredentials !== undefined && !warnedKeys.has('fixCredentials')) {
    warnedKeys.add('fixCredentials');
    console.warn(
      '[stream-connect-sdk] Init option "fixCredentials" is deprecated in 0.8 and ignored. Member-portal mode is now derived automatically from the presence of "connectAccessToken"; pass that alone and remove "fixCredentials" from your init() call.'
    );
  }
  // sdkToken is the legacy name for apiToken; both have always been
  // accepted as init options. Map sdkToken -> apiToken so downstream
  // code (sdkAxiosMaker, requests) only has to read one field.
  if (opts.sdkToken && !opts.apiToken) {
    out.apiToken = opts.sdkToken;
  }
  // Default the renderXxx flags to true (matches legacy SDK behavior:
  // these were truthy in the test sandbox even when not set).
  out.renderChoosePayer = opts.renderChoosePayer !== false;
  out.renderPayerForm = opts.renderPayerForm !== false;
  out.renderEndWidget = opts.renderEndWidget !== false;
  // Default `enablePatientAccessAPI` to true so PAA-routed payers
  // (Anthem 1697/1698/1693, UHC Interop, Kaiser Interop, Empire BCBS
  // API, etc.) take the `InteroperabilityPayerForm` OAuth-popup branch
  // instead of falling through to the raw `interoperability.OnBoard`
  // schema (which exposes `interoperability_refresh_token` as a user-
  // visible text input — meaningless since the OAuth callback is what
  // populates that field server-side). Customers who explicitly pass
  // `enablePatientAccessAPI: false` (or the legacy `enableInterop: false`,
  // which the alias mapping above already lowered into this same field)
  // keep the opt-out. Uses `??` so an explicit `false` is respected
  // and only `undefined` (neither flag set) falls through to the new
  // default.
  out.enablePatientAccessAPI = out.enablePatientAccessAPI ?? true;
  // Default realTimeVerification to true — matches the 0.7.7 entry
  // point's default. (Earlier drafts of the 0.8 changelog incorrectly
  // claimed the 0.7.x default was false; the source contradicts that.)
  // The transport changed (SSE replaces polling) but the default did
  // not. Pass false explicitly to disable the validation UI feedback.
  out.realTimeVerification = opts.realTimeVerification !== false;
  // Map the human-friendly callback names to the internal doneStep*
  // names the SDK component reads. The 0.7.x entry did this mapping
  // before passing props through; without it, an integrator passing
  // `init({ doneFixCredentials: fn })` per the public README would
  // see fn never invoked. Canonical name wins if both are set.
  out.doneStep1 ??= opts.doneSelectEnrollProcess;
  out.doneStep2 ??= opts.doneFixCredentials;
  out.doneStep3 ??= opts.doneChoosePayer;
  out.doneStep4 ??= opts.doneCreatedForm;
  out.doneRealtime ??= opts.doneRealTime;
  return out;
};

/**
 * Pull the post-redirect query params the Patient Access API flow
 * relies on:
 *
 *  - `?accessToken=…` — minted by app.tpastream.com after the carrier
 *    redirect completes; consumed on first read (single-use). Takes
 *    precedence over the `connectAccessToken` init option since it's
 *    the freshest value.
 *  - `?forceTPAStreamSdkEnd=1` — flag set by the redirect URL the SDK
 *    constructs in setStep4 when `enablePatientAccessAPISinglePage` is
 *    true. Tells this load to skip straight to the end widget.
 *
 * Both are stripped from the URL via history.replaceState so a refresh
 * doesn't re-trigger them AND the back button can't restore the
 * token-bearing URL. The strip happens regardless of whether the value
 * was actually applied — leaving `?accessToken=…` in the address bar
 * after a successful redirect would leak it to anything that logs
 * window.location.
 */
const consumeRedirectParams = (): {
  accessToken: string | null;
  shouldForceEnd: boolean;
} => {
  if (typeof window === 'undefined') {
    return { accessToken: null, shouldForceEnd: false };
  }
  const search = new URLSearchParams(window.location.search);
  const accessToken = search.get('accessToken');
  const shouldForceEnd = !!search.get('forceTPAStreamSdkEnd');
  let mutated = false;
  if (accessToken) {
    search.delete('accessToken');
    mutated = true;
  }
  if (shouldForceEnd) {
    search.delete('forceTPAStreamSdkEnd');
    mutated = true;
  }
  if (mutated) {
    const qs = search.toString();
    const newUrl =
      window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
    // replaceState (not pushState) so the back button can't return to
    // the original URL containing ?accessToken=… — that token is
    // single-use and shouldn't be reachable via history navigation
    // (browser autofill, address bar, referrer leak, etc.).
    window.history.replaceState(null, '', newUrl);
  }
  return { accessToken, shouldForceEnd };
};

const StreamConnect = (options: SDKInitOptions) => {
  if (typeof options.el !== 'string') {
    console.error(
      '[stream-connect-sdk] init failed: `el` must be a CSS selector string'
    );
    return;
  }

  console.log(`TPAStream Connect SDK v${VERSION}`);

  const normalized = normalizeOptions(options);

  // Apply redirect-param overrides AFTER normalizeOptions so the
  // accessToken from the URL wins over a stale connectAccessToken
  // baked into the page.
  const { accessToken, shouldForceEnd } = consumeRedirectParams();
  if (accessToken) {
    normalized.connectAccessToken = accessToken;
  }
  // Normalize forceEndStep to a number. Both the legacy 0.7.x boolean
  // (`forceEndStep: true`) and the new explicit-step number form are
  // accepted; truthy collapses to 5 (the FinishedEasyEnroll step) and
  // the URL-side `forceTPAStreamSdkEnd` flag triggers the same path.
  if (shouldForceEnd || normalized.forceEndStep) {
    normalized.forceEndStep =
      typeof normalized.forceEndStep === 'number' ? normalized.forceEndStep : 5;
  }

  onDOMReady(() => {
    const container = document.querySelector(options.el);
    if (!container) {
      console.error(
        `[stream-connect-sdk] init failed: element ${options.el} not found in DOM`
      );
      options.handleInitErrors?.(
        new Error(`Element ${options.el} not found in DOM`)
      );
      return;
    }
    // Tear down any previous root on this container before mounting a
    // fresh one. This guarantees the SDK reinitializes cleanly when
    // host pages call StreamConnect() again with new identity (token,
    // user, employer) or after a visibility toggle. The WeakMap cache
    // is what keeps multiple concurrent SDK instances on different `el`
    // selectors isolated from each other.
    const previousRoot = rootCache.get(container);
    if (previousRoot) {
      previousRoot.unmount();
      rootCache.delete(container);
    }
    const root = createRoot(container);
    rootCache.set(container, root);
    root.render(
      <ThemeProvider theme={normalized.theme}>
        <ActiveValidationsProvider>
          <SDK {...normalized} />
        </ActiveValidationsProvider>
      </ThemeProvider>
    );
  });
};

export default StreamConnect;
