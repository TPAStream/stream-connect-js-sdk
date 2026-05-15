import { createRoot } from 'react-dom/client';
import '../styles/tailwind.css';
import { SDK } from '../components/SDK';
import { ActiveValidationsProvider } from '../contexts/ActiveValidationsContext';
import { ThemeProvider } from '../theme/theme';
import type { SDKInitOptions } from '../types-init';

const VERSION = '0.8.0-alpha.1';

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
  // Default realTimeVerification to true. The 0.7.x default was false
  // because polling /sdk-api/validate-credentials every 5 seconds was
  // costly enough that opting in made sense. With the SSE consumer
  // landed in 0.8.0 the cost is negligible — most integrations want
  // validation feedback by default rather than submit-and-pray.
  out.realTimeVerification = opts.realTimeVerification !== false;
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
 * Both are stripped from the URL via history.pushState so a refresh
 * doesn't re-trigger them. The strip happens regardless of whether the
 * value was actually applied — leaving `?accessToken=…` in the address
 * bar after a successful redirect would leak it to anything that logs
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
    window.history.pushState(null, '', newUrl);
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
  if (shouldForceEnd) {
    // Match the legacy entry's `!!shouldForceEnd || !!forceEndStep`
    // semantic — flag is truthy if either source set it. Use 5
    // (the wizard's terminal step) so the controller's existing
    // forceEndStep branch lands on the FinishedEasyEnroll widget.
    normalized.forceEndStep = normalized.forceEndStep || 5;
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
    const root = createRoot(container);
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
