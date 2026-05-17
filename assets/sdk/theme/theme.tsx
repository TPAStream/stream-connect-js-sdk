import {
  type CSSProperties,
  type ReactNode,
  createContext,
  useContext,
  useMemo
} from 'react';

/**
 * Runtime theme override. Customers pass `theme: { primaryColor }` to
 * the SDK init() and we translate it into CSS variables on the root
 * container. No global stylesheet writes; every theme override is
 * scoped to one .tpa-sdk-root subtree, so two SDK instances on the
 * same page can have different themes without stepping on each other.
 */

export interface SDKTheme {
  /** Hex like '#2563eb' or rgb triplet '37 99 235'. */
  primaryColor?: string;
}

const ThemeContext = createContext<SDKTheme>({});

export const useTheme = (): SDKTheme => useContext(ThemeContext);

const HEX_RGB_RE = /^[0-9a-fA-F]{6}$/;

const hexToRgbTriplet = (hex: string): string | null => {
  // Accept '#rrggbb' or 'rrggbb'. For a hex shorthand ('#rgb') we don't
  // bother (customer can pass full hex).
  const cleaned = hex.replace(/^#/, '');
  // Number.parseInt accepts partially-valid hex like "12zzzz" (parses
  // up to the first non-hex char and returns the prefix's value).
  // Validate strictly against the 6-hex-digit contract first so a
  // malformed primaryColor is rejected and falls back to the default
  // theme instead of being silently coerced.
  if (!HEX_RGB_RE.test(cleaned)) return null;
  const num = Number.parseInt(cleaned, 16);
  if (Number.isNaN(num)) return null;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `${r} ${g} ${b}`;
};

const parseRgbTriplet = (triplet: string): [number, number, number] | null => {
  // Pre-formatted rgb triplet path. Validate strictly: exactly three
  // whitespace-separated tokens, each parseable as a finite integer in
  // [0, 255]. A loose `triplet.split(' ').map(Number)` would happily
  // accept `"37 99 blue"` and produce NaN segments that propagate
  // into the generated CSS variables as `NaN`, leaving themed Tailwind
  // colors invalid rather than falling back to the default theme.
  const parts = triplet.trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const nums: number[] = [];
  for (const p of parts) {
    const n = Number(p);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 255) {
      return null;
    }
    nums.push(n);
  }
  return [nums[0]!, nums[1]!, nums[2]!];
};

const buildPrimaryShades = (primary: string): Record<string, string> | null => {
  // We accept either a hex (#2563eb) or a pre-formatted rgb triplet
  // ('37 99 235'). For a hex we generate an 8-shade scale
  // (50 / 100 / 200 / 300 / 500 / 600 / 700 / 800) by mixing the
  // primary with white (lighter shades) and black (darker shades).
  // Not as nuanced as a designed palette but good enough to keep
  // hover/focus states, themed borders, and surface accents looking
  // intentional. The shade list mirrors `colors.primary` in
  // `tailwind.config.js`; keep the two in sync when extending.
  let rgb: [number, number, number] | null;
  if (primary.includes(' ')) {
    rgb = parseRgbTriplet(primary);
  } else {
    const triplet = hexToRgbTriplet(primary);
    rgb = triplet ? parseRgbTriplet(triplet) : null;
  }
  if (!rgb) return null;
  const [r, g, b] = rgb;
  const mix = (target: number, ratio: number) =>
    Math.round(target * (1 - ratio) + 255 * ratio);
  const mixDark = (target: number, ratio: number) =>
    Math.round(target * (1 - ratio));
  return {
    '--tpa-color-primary-50': `${mix(r, 0.92)} ${mix(g, 0.92)} ${mix(b, 0.92)}`,
    '--tpa-color-primary-100': `${mix(r, 0.82)} ${mix(g, 0.82)} ${mix(b, 0.82)}`,
    '--tpa-color-primary-200': `${mix(r, 0.7)} ${mix(g, 0.7)} ${mix(b, 0.7)}`,
    '--tpa-color-primary-300': `${mix(r, 0.5)} ${mix(g, 0.5)} ${mix(b, 0.5)}`,
    '--tpa-color-primary-500': `${mix(r, 0.1)} ${mix(g, 0.1)} ${mix(b, 0.1)}`,
    '--tpa-color-primary-600': `${r} ${g} ${b}`,
    '--tpa-color-primary-700': `${mixDark(r, 0.15)} ${mixDark(g, 0.15)} ${mixDark(b, 0.15)}`,
    '--tpa-color-primary-800': `${mixDark(r, 0.25)} ${mixDark(g, 0.25)} ${mixDark(b, 0.25)}`
  };
};

interface ThemeProviderProps {
  theme?: SDKTheme;
  children: ReactNode;
}

/**
 * Read the current theme's CSS-variable overrides as an inline-style
 * object. Components that render OUTSIDE the .tpa-sdk-root subtree —
 * notably any Headless UI primitive that portals to document.body —
 * must re-apply these vars themselves; the class alone only picks up
 * the *default* shades from the stylesheet, not the customer's
 * primaryColor override.
 */
export const useThemeCSSVars = (): CSSProperties => {
  const theme = useTheme();
  return useMemo<CSSProperties>(() => {
    if (!theme?.primaryColor) return {};
    const shades = buildPrimaryShades(theme.primaryColor);
    return (shades || {}) as CSSProperties;
  }, [theme?.primaryColor]);
};

export const ThemeProvider = ({ theme, children }: ThemeProviderProps) => {
  const cssVars = useMemo<CSSProperties>(() => {
    if (!theme?.primaryColor) return {};
    const shades = buildPrimaryShades(theme.primaryColor);
    return (shades || {}) as CSSProperties;
  }, [theme?.primaryColor]);

  return (
    <ThemeContext.Provider value={theme || {}}>
      <div className="tpa-sdk-root" style={cssVars}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};
