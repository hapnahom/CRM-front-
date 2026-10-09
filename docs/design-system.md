# Design System

Centralized design tokens for the CRM frontend. Change branding in **one place** by editing token files.

## Token sources

| File                                              | Purpose                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| [`styles/tokens.css`](../styles/tokens.css)       | CSS custom properties — colors, typography, spacing, radius, shadows |
| [`lib/design-tokens.ts`](../lib/design-tokens.ts) | JS mirror for Ant Design, Chart.js, inline styles                    |

Keep both files in sync when rebranding.

## Rebranding (change colors globally)

Edit `styles/tokens.css`:

```css
:root {
  --color-brand: #ed6925;
  --color-brand-hover: #d45e1f;
  --color-brand-muted: #fdf0e9;
  --color-brand-foreground: #ffffff;
}
```

Edit matching values in `lib/design-tokens.ts`:

```ts
color: {
  brand: '#ed6925',
  brandHover: '#d45e1f',
  // ...
}
```

## Tailwind usage

| Token         | Classes                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------- |
| Brand         | `bg-brand`, `text-brand`, `hover:bg-brand-hover`, `bg-brand-muted`, `border-brand-border` |
| Surfaces      | `bg-surface-page`, `bg-surface-card`, `bg-surface-elevated`                               |
| Text          | `text-foreground`, `text-muted-foreground`                                                |
| Borders       | `border-border`, `border-border-strong`                                                   |
| Status        | `text-success`, `text-warning`, `text-error`                                              |
| shadcn        | `bg-primary`, `bg-muted`, `bg-destructive` (wired to tokens)                              |
| Typography    | `text-xs` (11px), `text-sm` (13px), `text-base` (14px)                                    |
| Radius        | `rounded-sm`, `rounded-md`, `rounded-lg`                                                  |
| Kanban stages | `bg-stage-violet`, `border-stage-violet`, etc.                                            |

## Ant Design

Global theme: [`providers/antdProvider.tsx`](../providers/antdProvider.tsx) reads from `lib/design-tokens.ts`.

Page-level override: import `antdPageTheme` from `lib/design-tokens.ts`.

## Dark mode

Toggle in Account Settings → Appearance. [`providers/ThemeProvider.tsx`](../providers/ThemeProvider.tsx) applies the `dark` class to `<html>`. Override dark tokens in the `.dark` block in `styles/tokens.css`.

## Dynamic colors (not global tokens)

- Lead/deal stage `colorCode` from API
- [`utils/colors.ts`](../utils/colors.ts) status picker palette

## Do not use

- Hardcoded hex in `className` (e.g. `bg-[#ed6925]`) — ESLint warns on new hex literals
- Duplicate color values outside token files

## File structure

```
styles/
  tokens.css       — all CSS variables
  base.css         — html, body, utilities
  ant-overrides.css — Ant Design component overrides
  editors.css      — Quill, TipTap, ProseMirror
  print.css        — PDF export styles
app/globals.css    — imports + Tailwind directives
```
