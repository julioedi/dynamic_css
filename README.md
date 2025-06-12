
# CustomCssSheet

`CustomCssSheet` is a lightweight, flexible JavaScript utility that dynamically generates and injects CSS styles based on utility class names found in your HTML. Inspired by utility-first frameworks like Tailwind CSS, it allows for custom class generation and real-time style application without any external CSS files or build steps.

This tool is particularly useful for:
- Creating consistent, atomic styles in pure JavaScript projects.
- Rapid prototyping where responsiveness and layout precision matter.
- Handling dynamic class generation in apps with real-time DOM updates.

## Features

- Supports responsive breakpoints (`xl:`, `md:`, `sm:`).
- Dynamically generates styles for:
  - **Transform utilities**
  - **Text alignment and typography**
  - **Sizing units (px, %, vw, vh)**
  - **Spacing (margin, padding)**
  - **Borders and radius**
  - **Colors (standard CSS named colors)**
  - **Display types**
  - **Elevation/shadow levels**
  - **Grid layouts**
- Automatically observes DOM for class changes using `MutationObserver`.

## Installation

```js
const cssSheet = new CustomCssSheet();
```

## Usage Example

```html
<div class="text-center bg-blue color-white p-16 radius-8 elevation-2 grid-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

## Responsive Breakpoints

| Prefix | Max Width |
|--------|-----------|
| `xl:`  | 1366px    |
| `md:`  | 820px     |
| `sm:`  | 640px     |

Add a prefix to any class to apply it only under that screen width.

## Supported Class Categories

### 🎨 Colors

```html
<div class="background-blue color-white border-color-black"></div>
```

Supports all CSS color keywords.

### 📏 Sizing

```html
<div class="width-80 height-160 width-100\% vw-min-100 vh-max-100"></div>
```

- Supports absolute (px), percentage (`\%`), and viewport units (vw, vh).

### 🔤 Typography

```html
<p class="text-16 text-rem-1_25 line-height-24 text-justify"></p>
```

- Font size, line-height, text alignment.

### 📦 Spacing

```html
<div class="p-16 px-12 pt-8 m-4 my-8 ml-2"></div>
```

- Padding and margin on all/specific sides.

### 🧱 Border & Radius

```html
<div class="border-2 border-l-4 border-lr-4 radius-12 border-tr-8"></div>
```

- Fully granular border control and radii.

### 📍 Positioning

```html
<div class="position-absolute pos-top-0 pos-left-50\% inset-0"></div>
```

- Position type and side offsets.

### 🌀 Transform Utilities

```html
<div class="transform-[rotate(45deg)_translateX(20px)] transform-rotate-45"></div>
```

- Supports custom and shorthand transforms.

### 🌫️ Elevation

```html
<div class="elevation-4 elevation-8-alpha-60"></div>
```

- Material-style shadow system with optional alpha.

### 🧮 Grid Layouts

```html
<div class="grid-1"> <!-- 1 column --> </div>
<div class="grid-3"> <!-- 3 equal columns --> </div>
<div class="grid-12"> <!-- 12-column grid --> </div>
```

These classes apply `display: grid` and set `grid-template-columns: repeat(n, 1fr)`.

Useful for quickly laying out responsive grid items without manually writing CSS.

You can combine it with responsive variants:

```html
<div class="grid-4 md:grid-2 sm:grid-1"></div>
```

This enables fluid layout transitions based on screen size.

## Notes

- Utility classes are parsed only if they match supported patterns.
- Escaping (`\%`) is required for special characters like `%`.
- Uses a single style tag (`#dynamic-css-sheet`) for clean injection.

## License

MIT
