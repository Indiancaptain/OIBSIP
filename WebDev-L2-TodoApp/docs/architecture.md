# Architecture

Arclight is intentionally a single HTML page, one stylesheet, and one script — no bundler, no framework, no package manager. This document explains how the three files are organized internally so the codebase stays easy to extend.

## Why vanilla JS, and how state is managed

There's no virtual DOM here, so the app follows one simple rule throughout `script.js`:

**State changes → `persist()` → `renderAll()` (or a narrower `render*()` call).**

All application data lives in two plain objects at the top of `script.js`:

- `State.tasks` / `State.categories` — the persisted data
- `State.ui` — transient view state (active filter, search text, selection, calendar cursor) that is *not* saved

Every action function (`toggleComplete`, `deleteTask`, `archiveTask`, `reorderTasks`, form submit handlers, etc.) mutates `State`, calls `persist()` to write the whole state tree to `localStorage` as one JSON blob, and then re-renders. Rendering is idempotent: each `render*()` function clears and rebuilds the DOM it owns from `State`, so the UI can never drift out of sync with the data — there's exactly one source of truth.

For a project this size, granular DOM diffing would add complexity without a real performance cost; full re-renders of a few dozen task cards are effectively instant.

## File responsibilities

- **`index.html`** — semantic structure only: sidebar, dashboard header (including the Day Arc SVG), toolbar, task list, side panel, modals, and the toast container. All icons are inline SVG (no icon font, no external requests).
- **`style.css`** — design tokens as CSS custom properties (one block per theme), then layout and components in the order they appear on the page, then a responsive section at the end. Every color reference in components uses a `var(--token)` so swapping `data-theme` on `<body>` re‑themes the whole app instantly.
- **`script.js`** — organized top‑to‑bottom as: Storage → default data → State → Utils → Toasts → Filtering/sorting → Renderers → Task actions → Modal handling → Quick add → Category modal → Bulk actions → Theme → Micro‑interactions → Event wiring → Init.

## The Day Arc

The dashboard's signature visual is an SVG semicircle (`M20 150 A130 130 0 0 1 280 150`). Its length is the true circumference of that semicircle (`π × r`, r = 130 ⇒ ≈408.4), used as the `stroke-dasharray`/`stroke-dashoffset` pair so the fill animates proportionally to today's completion percentage. A helper, `pointOnArc(t)`, maps a `0–1` progress value to an `(x, y)` coordinate on the arc using basic trigonometry; it positions both the "current time of day" marker and a dot for every task due today, colored by priority.

## Persistence model

Everything is stored under a single `localStorage` key (`arclight.v1`) as one JSON object: `{ tasks, categories, settings }`. Keeping it as one key (rather than one per task) keeps writes atomic and simple, and is well within `localStorage`'s size limits for a personal task list.

## Accessibility notes

- Landmarks: `<aside>` for navigation, `<main>` for content, dialogs use `role="dialog"` + `aria-modal`.
- The task list is an `aria-live="polite"` region so screen readers announce additions/removals.
- All interactive icons have `aria-label`s; toggle buttons expose `aria-pressed`/`aria-expanded`/`aria-selected` as appropriate.
- Focus is visibly styled (`:focus-visible`) and is moved into modals on open.
- `prefers-reduced-motion` disables animation durations globally.

## Extending the app

- **New task field**: add the input to the modal in `index.html`, read/write it in `handleTaskFormSubmit` / `openTaskModal`, and surface it in `buildTaskCard` if it should show on the card.
- **New filter**: add a chip or sidebar button with a `data-filter`, then add a `case` in `getVisibleTasks()`.
- **New theme**: add a `[data-theme="name"]` block in `style.css` with the same custom‑property names as the existing themes, and add a `.theme-dot` button in `index.html`.
