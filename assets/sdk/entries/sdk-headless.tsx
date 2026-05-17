/**
 * Headless SDK entry. Same StreamConnect function as the default
 * `sdk.tsx` but WITHOUT the tailwind stylesheet import — saves
 * ~50 KB of styles a customer doesn't need if they're driving every
 * step themselves via the renderXxx callbacks.
 *
 * Headless usage pattern:
 *   import StreamConnect from 'stream-connect-sdk/headless';
 *   StreamConnect({
 *     el: '#mount',
 *     ...identity,
 *     renderChoosePayer: false,   // emits doneChoosePayer instead
 *     renderPayerForm:   false,   // emits doneCreatedForm instead
 *     renderEndWidget:   false,   // emits doneEasyEnroll instead
 *     doneChoosePayer:   payload => mountYourOwnPicker(payload),
 *     doneCreatedForm:   payload => mountYourOwnCredsForm(payload),
 *     doneEasyEnroll:    payload => mountYourOwnEndScreen(payload)
 *   });
 *
 * The SDK still mounts a React root at `el` because the renderXxx
 * callbacks need a host component instance, but the visible chrome
 * is whatever your callbacks render. The non-blocking validation
 * hero and corner panel are still mounted (they're how the SDK
 * surfaces SSE / 2FA progress for ANY render mode); style them
 * yourself by hiding `.tpa-sdk-root [data-tpa-hero]` /
 * `[data-tpa-panel]` in your own CSS if you don't want them.
 *
 * See docs/headless.md for the complete recipe.
 */
export { default } from './sdk-core';
