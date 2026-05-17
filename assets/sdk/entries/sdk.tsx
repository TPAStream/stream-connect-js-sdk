/**
 * Default (styled) SDK entry. Bundles tailwind.css so the built-in
 * widgets render with their full Plaid-Link-style chrome out of the
 * box. Customers who drive every step themselves via the renderXxx
 * callbacks and want to skip the ~50 KB of Tailwind output should
 * import the headless entry instead (`stream-connect-sdk/headless`).
 *
 * See docs/headless.md for the trade-off and integration recipe.
 */
import '../styles/tailwind.css';
export { default } from './sdk-core';
