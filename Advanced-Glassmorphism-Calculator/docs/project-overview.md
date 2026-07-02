# Project Overview

## Concept

Most glassmorphism calculators are a single frosted card floating on a gradient blob. Refract instead treats the whole interface as **stacked panes of glass in the same physical material** — the calculator, the history drawer, and the settings panel are all the same "glass," just positioned differently, and pressing a key sends a localized refraction ripple across the pane it's on, as if light were catching the surface.

## Design tokens

| Role | Token | Aurora value |
|---|---|---|
| Base background | `--color-bg-0` | `#0B1120` |
| Glass panel tint | `--color-glass` | `#1E293B` |
| Ink (primary text) | `--color-ink` | `#E8ECFA` |
| Accent (equals, active states) | `--color-accent` | `#7C93FF` |
| Operator accent | `--color-operator` | `#FF8B5E` |
| Secondary accent (memory, mint theme) | `--color-secondary` | `#4FD1C5` |

All four themes (Aurora, Dawn, Noir, Mint) redefine the same token set, so every component automatically re-themes — no component-level color logic anywhere in `script.js`.

**Type system**
- **Space Grotesk** — headings, buttons, brand: geometric and technical, matches the "instrument" feel.
- **JetBrains Mono** — the numeric display only: fixed-width digits keep the readout aligned like a physical calculator.
- **Inter** — small UI labels, settings copy, history metadata.

## Layout

The calculator and history drawer are laid out as **siblings in a flex row** on desktop, not a card-plus-modal. The drawer slides in and out of the same visual plane the calculator sits in, reinforcing "another pane of the same glass" rather than "a popup on top." On narrow viewports, the drawer becomes a fixed off-canvas panel with a scrim, since there isn't room for two panes side by side.

The settings panel is deliberately a separate off-canvas pane on the opposite edge, so history (data you generated) and settings (preferences you set) never compete for the same screen real estate.

## Signature interaction: the refraction ripple

Each `.key` has a `::after` pseudo-element positioned via CSS custom properties (`--ripple-x`, `--ripple-y`) that JavaScript sets to the exact pointer coordinates on press. A radial gradient scales and fades outward — a "light catching glass" moment rather than a generic scale-bounce. The same mechanism drives keyboard-triggered flashes, so keyboard-only users get the same feedback centered on the relevant key.

This is the one deliberately bold interaction; everything else (drawer slides, theme crossfades, hover states) stays quiet and fast so the ripple keeps its impact.

## JavaScript architecture

`script.js` is a single IIFE with five focused classes, kept deliberately framework-free:

- **`CalculatorEngine`** — Pure logic, zero DOM references. Owns the running expression, pending operator, and current entry as plain strings/numbers, mirroring how a physical calculator's register works (no `eval()` anywhere). Scientific functions are unary transforms applied to the current register. This separation means the engine could be unit-tested or reused in a CLI/Node context without changes.
- **`HistoryStore` / `ThemeManager` / `SettingsStore`** — Thin wrappers around `localStorage` with safe JSON parsing and graceful fallback if storage is unavailable (e.g., private browsing).
- **`SoundFeedback`** — Generates short sine-wave blips via the Web Audio API on demand; no audio files to fetch or license.
- **`UI`** — The only class that touches `document`. It owns event delegation (one click listener on the app root rather than one per key), keyboard handling, and rendering. This keeps DOM concerns out of the calculation logic entirely.

## Accessibility notes

- All icon-only buttons have `aria-label`/`sr-only` text.
- The history and settings panels use `aria-hidden` and `aria-expanded`, kept in sync with their visual state.
- The result display is an `aria-live="polite"` region so screen readers announce new results without interrupting typing.
- Focus rings are preserved and styled (`:focus-visible`) rather than suppressed.
- `prefers-reduced-motion` is respected automatically, and duplicated as an explicit in-app toggle for users who want to override their OS-level setting per-site.

## Known trade-offs

- Calculations use native JavaScript floating-point arithmetic with a rounding guard (`formatNumber`) to hide common artifacts like `0.1 + 0.2`. This is display-layer rounding, not arbitrary-precision math — sufficient for a general-purpose calculator, not for financial-grade precision.
- `color-mix()` is used for the glass tint; a solid-color fallback is declared immediately before it for the handful of older browsers without support.
