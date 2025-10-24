# Skeleton + Svelte Styling Guide

This project uses Skeleton UI library with Svelte 5 and Tailwind 4.

## Installation & Setup

Global stylesheet ([app.css](src/app.css)) should include:
```css
@import '@skeletonlabs/skeleton-svelte';
```

## Component Architecture

Skeleton uses a **composed pattern** with granular components:

```svelte
<Avatar>
  <Avatar.Image src="..." />
  <Avatar.Fallback>SK</Avatar.Fallback>
</Avatar>
```

### Key Patterns

**Style Props Convention**: All components accept CSS utilities via the `class` attribute. Styles automatically gain precedence over internal defaults through Tailwind's `@base` layer.

**Extensible Markup**: Use the `element` snippet to override internal HTML:

```svelte
<Accordion.ItemTrigger>
  {#snippet element({ attributes })}
    <button {...attributes}>Custom Button</button>
  {/snippet}
</Accordion.ItemTrigger>
```

**Provider Pattern**: Components support providers that expose Zag.js APIs:

```svelte
const tooltip = useTooltip({ id });
<Tooltip.Provider value={tooltip}>
  <!-- Access state via tooltip().open and tooltip().setOpen() -->
</Tooltip.Provider>
```

## Tailwind Integration

### Core Utilities

- **Color Classes**: `[property]-[color]-[shade]` maps to `--color-[color]-[shade]` CSS variables
- **Color Pairings**: Light/dark mode balancing via `light-dark()` CSS function
- **Typography Scale**: Dynamic font sizing with `--text-scaling` variable
- **Radius**: `rounded-base` and `rounded-container` for consistent border radius
- **Spacing**: Dynamic scaling via `--spacing` CSS variable

### Dark Mode

Skeleton supports three strategies:
1. **Media** (default): Uses `prefers-color-scheme` to match OS settings
2. **Selector**: Add `.dark` class to `<html>` element
3. **Data Attribute**: Use `data-mode="dark"` on `<html>`

Apply variants in markup:
```html
<div class="bg-white dark:bg-black">Content</div>
```

### Color Scheme Feature

Toggle light or dark rendering at any scope:
```svelte
<div class="scheme-light">
  <div class="bg-primary-50-950">Always light</div>
</div>
```

## Custom Animations

Override component animations using the `element` snippet with Svelte transitions:

```svelte
<Accordion.ItemContent>
  {#snippet element(attributes)}
    {#if !attributes.hidden}
      <div {...attributes} hidden={false} transition:slide>
        Content
      </div>
    {/if}
  {/snippet}
</Accordion.ItemContent>
```

Key steps: spread attributes, override the `hidden` attribute, apply transition directive.

## Form Elements

Skeleton requires the **Tailwind Forms Plugin** for semantic form styling. All form inputs automatically inherit theme colors and styles.

## Layout Best Practices

### Semantic HTML Structure
Use `<header>`, `<main>`, `<footer>`, `<aside>`, and `<article>` elements to properly denote page regions.

### Sticky Positioning
Combine utilities for persistent headers/sidebars:
- `sticky` + `top-0` + `z-10` for sticky headers
- Add `backdrop-blur` for glass-morphism effects
- Use `h-[calc(100vh-{offset}px)]` to account for other sticky elements

### Responsive Design
Leverage Tailwind's breakpoints:
```html
<div class="grid grid-cols-1 md:grid-cols-[auto_1fr]">
  <aside class="hidden md:block">Sidebar</aside>
  <main>Content</main>
</div>
```

Ensure `<html>` and `<body>` extend to full viewport height via `h-full`.

## Component Migration Notes

**Svelte 5 Adoption**: Components use modern Svelte features including runes and snippets rather than v4 patterns (no `bind:` or slot syntax from v4).

**Zag.js Foundation**: All components leverage Zag.js for accessible, framework-agnostic state management.

## Presets & Design System

Skeleton includes optional **preset classes** for buttons, badges, cards, and other UI elements (e.g., `preset-filled`, `preset-tonal`). These combine semantic styling with customization flexibility through standard Tailwind classes.

## Key Conventions

- Always spread component attributes from snippets to maintain functionality
- Prefer CSS variables over `@apply` for better maintainability
- Use Tailwind's arbitrary value syntax for custom values: `w-[200px]`
- Implement ARIA patterns from W3C when building accessible popovers/modals
- Import components and types from `@skeletonlabs/skeleton-svelte`

## Example Component Usage

```svelte
<script lang="ts">
  import { Avatar, Button } from '@skeletonlabs/skeleton-svelte';
</script>

<div class="card p-4 rounded-container">
  <Avatar class="mb-4">
    <Avatar.Image src="/avatar.jpg" alt="User" />
    <Avatar.Fallback>US</Avatar.Fallback>
  </Avatar>

  <Button class="preset-filled">
    Click Me
  </Button>
</div>
```
