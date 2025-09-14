# Dynamic CSS Sheet

Dynamic CSS Sheet is a lightweight runtime CSS engine that generates utility classes on the fly.
It works like a minimal Tailwind alternative — instead of requiring a build step, it injects CSS rules dynamically when classes appear in your HTML.

## Features
- Zero build step — include the script and it runs in the browser.
- Responsive utilities (configurable breakpoint codes and sizes via `window.sizes`).
- Custom dynamic colors via `window.dynamicCssColors` (creates `bg-<name>`, `border-<name>`, `color-<name>`, `outline-<name>` that map to `var(--<name>)`).
- Utility-first syntax: spacing, sizing, positioning, flex, grid, shadows, transforms, etc.
- Pseudo-states support: hover, focus, active, visited, link, checked, disabled, empty, valid, invalid, focus-within.
- DOM observer — automatically adds rules for classes found in newly added elements or when class attributes change.

## Installation

Place any optional configuration on `window` before loading the script, then include the script:

```html
<!-- Optional: configure breakpoints, scale and dynamic colors BEFORE the script loads -->
<script>
  // Customize responsive breakpoints (code -> min-width in px)
  window.sizes = [
    { code: "xs", size: 360 },
    { code: "sm", size: 540 },
    { code: "md", size: 768 },
    { code: "lg", size: 1024 },
    { code: "xl", size: 1366 },
    { code: "xxl", size: 1440 }
  ];

  // Optional: change spacing/size scale (default 0.25) its scaled in REM
  window.dynamiCssScale = 0.25;

  // Optional: dynamic color keys. For each key the engine will generate
  // classes that use var(--<key>), for example `bg-primary` => background-color: var(--primary)
  window.dynamicCssColors = ["primary", "secondary", "accent"];
</script>

<script src="dynamic-css-sheet.js"></script>
```

## Usage

### Colors

Define the CSS variables in your stylesheet or `:root`:

```css
:root {
  --primary: #4f46e5;
  --secondary: #f59e0b;
  --accent: #10b981;
}
```

Then use the generated utility classes (these come from `window.dynamicCssColors`):

```html
<div class="bg-primary color-primary border-primary">Box using CSS variable colors</div>
```

**Important:** the runtime expects dynamic color keys (in `window.dynamicCssColors`) to be provided **without** the `--` prefix. If you add `"primary"` to that array, the engine will produce classes such as `bg-primary` that resolve to `var(--primary)`.

The engine also generates utilities for many built-in CSS color names (for example `bg-red`, `color-blue`, etc.).

### Pseudo-states (hover, focus, etc.)

This engine encodes pseudo-states as a literal suffix on the class name using a colon. That means you should append the pseudo at the **end** of the class name. Example:

```html
<!-- Change bg on hover -->
<button class="bg-primary color-white bg-primary:hover">Hover me</button>

<!-- Focus state -->
<input class="border-1 border-primary border-1:focus"> <!-- note: pseudo appended to the classname -->

<!-- Responsive + pseudo: apply on small-and-up, when hovered -->
<div class="sm:bg-primary:hover">Small+ hover background</div>
```

**Note:** The engine expects the pseudo at the end of the full classname. The alternative notation `hover:bg-primary` (prefix form used by some utility frameworks) is **not** supported by this runtime. For responsive + pseudo use `sm:bg-name:hover` (responsive prefix first, pseudo appended last).

Supported pseudo states (case-insensitive): `hover`, `focus`, `active`, `visited`, `link`, `checked`, `disabled`, `empty`, `valid`, `invalid`, `focus-within`.

### Responsive utilities

Responsive prefixing uses the breakpoint codes you provided in `window.sizes`. By default the runtime includes a set of breakpoints. Example usage:

```html
<!-- apply classes at different breakpoints -->
<div class="w-10 sm:w-20 md:w-40 lg:w-80">Responsive widths</div>

<!-- responsive + pseudo -->
<button class="sm:bg-primary:hover lg:bg-secondary">Small+ hover then large bg</button>
```

Important details:
- Provide `window.sizes` **before** loading the script if you want custom breakpoint codes or sizes.
- The runtime creates one `<style>` sheet per breakpoint and inserts rules with `media` queries using the min-width values you provided.

### Transforms

Transforms are supported using utility-like names. Examples the engine understands include:

```html
<div class="transform-rotate-45">Rotated 45deg</div>
<div class="transform-translateX-10">Translated on X</div>
<!-- Or inline complex transform using bracket syntax -->
<div class="transform-[translateX(20px)_scale(1.2)]">Custom transform</div>
```

### Spacing, sizing, grid, flex, shadows, etc.

The runtime generates a large set of utilities (padding/margin with negative variants, width/height, min/max sizes, font size helpers, border-radius, grid templates, flex helpers, gap, elevation box-shadows, and more). See the code for the full list of generated utilities. Utilities depend on `window.dynamiCssScale` to convert indices into rem values (default 0.25).

## Notes and gotchas

- Because class names contain literal colons (`:`) you may need to escape or use framework-specific techniques when using single-file component syntaxes or templating systems that interpret `:` (for example, Vue template `:` shorthand). Using `v-bind:class` or double-quoted class attributes usually avoids issues.
- Provide configuration (`window.sizes`, `window.dynamicCssColors`, `window.dynamiCssScale`) **before** the script tag that loads the runtime.
- The runtime observes DOM mutations, so classes added dynamically by JavaScript will be processed automatically.
- If you need a class name that contains characters that your HTML templating system strips or transforms, consider adding classes programmatically (element.classList.add) instead of writing them inline in markup.



## 🛠 Usage Examples

### 📐 Spacing
```html
<div class="m-4 p-2">Margin 4, Padding 2</div>
<div class="sm:mt-8 lg:mb-16">Responsive margins</div>
```

### 🎨 Colors
Define your palette in CSS:
```css
:root {
  --primary: #4f46e5;
  --secondary: #f59e0b;
}
```

Then use in HTML:
```html
<button class="bg-[--primary] text-white hover:bg-[--secondary]">
  Click Me
</button>
```

### 🧭 Positioning
```html
<div class="absolute top-0 left-0">Top Left</div>
<div class="relative bottom-2 right-4">Relative box</div>
```

### 📏 Width & Height
```html
<div class="w-10 h-5 bg-gray-200"></div>
<div class="sm:w-20 md:w-40 lg:w-80 h-full"></div>
```

### 📦 Flex and Grid
```html
<div class="flex gap-4 justify-center">
  <div class="bg-gray-200 p-2">Item 1</div>
  <div class="bg-gray-200 p-2">Item 2</div>
</div>

<div class="grid grid-cols-3 gap-2">
  <div class="bg-gray-200 p-2">A</div>
  <div class="bg-gray-200 p-2">B</div>
  <div class="bg-gray-200 p-2">C</div>
</div>
```

## License

MIT
