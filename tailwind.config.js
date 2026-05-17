/**
 * Tailwind config for the SDK bundle.
 *
 * The `tpa-` prefix on every utility class is load-bearing: the SDK
 * embeds in third-party customer sites that may already use Tailwind
 * (or any other utility-class CSS framework). Without the prefix our
 * `bg-blue-600` would either silently match the host page's
 * `bg-blue-600` (different shade, hostile override) or get stripped
 * by their PurgeCSS pass.
 *
 * `content` lists every file we want Tailwind to scan for class names.
 * Anything under assets/sdk + assets/shared is fair game; tests and
 * sdk-hook are intentionally excluded.
 */

module.exports = {
  prefix: 'tpa-',
  content: [
    './assets/sdk/**/*.{js,jsx,ts,tsx}',
    './assets/shared/**/*.{js,jsx,ts,tsx}'
  ],
  // The host page's CSS reset (or lack of one) is unpredictable. Our
  // primitives are wrapped in a single `tpa-sdk-root` container that
  // re-applies the rules we depend on, instead of a global preflight
  // that could leak into the host page's <body>.
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif'
        ]
      },
      colors: {
        // Theme tokens are CSS variables so the SDK's `primaryColor`
        // init prop can override them at runtime via inline style on
        // the root container. Defaults below match the Plaid-Link
        // accent (blue-600).
        primary: {
          50: 'rgb(var(--tpa-color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--tpa-color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--tpa-color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--tpa-color-primary-300) / <alpha-value>)',
          500: 'rgb(var(--tpa-color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--tpa-color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--tpa-color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--tpa-color-primary-800) / <alpha-value>)'
        }
      },
      boxShadow: {
        card: '0 1px 3px rgb(0 0 0 / 0.08), 0 4px 12px rgb(0 0 0 / 0.04)',
        'card-hover':
          '0 2px 6px rgb(0 0 0 / 0.10), 0 8px 24px rgb(0 0 0 / 0.06)'
      }
    }
  },
  plugins: []
};
