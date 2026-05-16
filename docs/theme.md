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

Accepts a hex color string (`#RRGGBB` or `#RGB`). The SDK derives a full shade ramp (50 through 900) from the value and binds it to CSS variables under `.tpa-sdk-root`. Two SDK instances on the same page with different `primaryColor` values render independently; the overrides are scoped, not global.

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

All theme overrides are applied via CSS custom properties on the `.tpa-sdk-root` element the SDK mounts inside your `el` selector. They do not leak to any sibling or ancestor element on the host page. The SDK's own Tailwind utility classes are namespaced with the `tpa-` prefix and scoped to the same subtree, so the SDK will not clobber host-page styles and vice versa.

## What's coming

For more comprehensive branding (custom fonts, surface colors, dark mode, configurable border radius) we are gathering feedback. Open an issue at https://github.com/TPAStream/stream-connect-js-sdk/issues if you need controls beyond `primaryColor`.
