import {
  type CSSProperties,
  type ReactNode,
  createContext,
  useContext,
  useMemo
} from 'react';

/**
 * Runtime theme override. Customers pass `theme` (or legacy
 * `primaryColor`) to the SDK init() and we translate it into CSS
 * variables on the root container. No global stylesheet writes — every
 * theme override is scoped to one .tpa-sdk-root subtree, so two SDK
 * instances on the same page can have different themes without
 * stepping on each other.
 */

export interface SDKTheme {
  /** Hex like '#2563eb' or rgb triplet '37 99 235'. */
  primaryColor?: string;
  /** Default radius for cards/buttons/inputs. Tailwind token name. */
  radius?: 'sm' | 'md' | 'lg';
}

const ThemeContext = createContext<SDKTheme>({});

export const useTheme = (): SDKTheme => useContext(ThemeContext);

const hexToRgbTriplet = (hex: string): string | null => {
  // Accept '#rrggbb' or 'rrggbb'. For a hex shorthand ('#rgb') we don't
  // bother — customer can pass full hex.
  const cleaned = hex.replace(/^#/, '');
  if (cleaned.length !== 6) return null;
  const num = Number.parseInt(cleaned, 16);
  if (Number.isNaN(num)) return null;
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  return `${r} ${g} ${b}`;
};

const buildPrimaryShades = (primary: string): Record<string, string> | null => {
  // We accept either a hex (#2563eb) or a pre-formatted rgb triplet
  // ('37 99 235'). For a hex we generate a coarse 5-shade scale by
  // mixing the primary with white (lighter shades) and black (darker
  // shades). Not as nuanced as a designed palette but good enough to
  // keep hover/focus states looking intentional.
  const triplet = primary.includes(' ') ? primary : hexToRgbTriplet(primary);
  if (!triplet) return null;
  const [r = 0, g = 0, b = 0] = triplet.split(' ').map(Number);
  const mix = (target: number, ratio: number) =>
    Math.round(target * (1 - ratio) + 255 * ratio);
  const mixDark = (target: number, ratio: number) =>
    Math.round(target * (1 - ratio));
  return {
    '--tpa-color-primary-50': `${mix(r, 0.92)} ${mix(g, 0.92)} ${mix(b, 0.92)}`,
    '--tpa-color-primary-100': `${mix(r, 0.82)} ${mix(g, 0.82)} ${mix(b, 0.82)}`,
    '--tpa-color-primary-500': `${mix(r, 0.1)} ${mix(g, 0.1)} ${mix(b, 0.1)}`,
    '--tpa-color-primary-600': `${r} ${g} ${b}`,
    '--tpa-color-primary-700': `${mixDark(r, 0.15)} ${mixDark(g, 0.15)} ${mixDark(b, 0.15)}`
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
