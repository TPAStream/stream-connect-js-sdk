# Theme

The 0.8 SDK ships with a polished default appearance: cards, generous whitespace, system-font stack, accessible focus rings. Most integrators do not need to write any CSS. For brand-color matching, the `theme` init option exposes a small set of overrides applied as scoped CSS variables on the SDK root subtree.

## `theme.primaryColor`

Recolors the SDK's primary accent surfaces (buttons, links, focus rings, progress bars, selected-state highlights) to match your brand.

```javascript
StreamConnect({
  el: '#react-hook',
  apiToken: 'VeryLegitKey',
  // ... other options ...
  theme: {
    primaryColor: '#2563eb'
  }
});
```

Accepts a 6-digit hex color string (`#RRGGBB`) or a pre-formatted RGB triplet (`"37 99 235"`). The 3-digit shorthand `#RGB` is not supported. The SDK derives a small shade scale (50 / 100 / 500 / 600 / 700) from the value and binds it to CSS variables under `.tpa-sdk-root`. Two SDK instances on the same page with different `primaryColor` values render independently; the overrides are scoped, not global.

### What it recolors

- Primary buttons (background + hover/active states)
- Links inside SDK widgets
- Focus rings on inputs, buttons, checkboxes
- Progress indicators and active-step markers
- Selected-state highlights (e.g., the chosen carrier tile)

### What it does not recolor

- Carrier logos and Patient Access API payer tiles (these display the carrier's own branding)
- Error states (red), success states (green), and other semantic colors
- Body text, secondary text, card backgrounds, dividers
- Host-page content outside the SDK subtree

If you need to override a color the `primaryColor` knob does not touch, file an issue describing the use case; we would rather extend the theme API than have integrators target SDK internals with descendant CSS selectors that will break on the next release.

## Scoping

All theme overrides are applied via CSS custom properties on the `.tpa-sdk-root` element the SDK mounts inside your `el` selector. They do not leak to any sibling or ancestor element on the host page.

The SDK's own Tailwind utility classes use the `tpa-` prefix to avoid name collisions with host-page CSS. The utility classes themselves are global (anywhere `.tpa-text-white` appears in the DOM, the rule applies), but the prefix means a host page that doesn't use `tpa-*` class names will never collide. The reset and theme variables are wrapped in `.tpa-sdk-root` so they only affect the SDK subtree.

## What's coming

For more comprehensive branding (custom fonts, surface colors, dark mode, configurable border radius) we are gathering feedback. Open an issue at https://github.com/TPAStream/stream-connect-js-sdk/issues if you need controls beyond `primaryColor`.
