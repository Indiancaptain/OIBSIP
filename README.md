# Refract — Advanced Glassmorphism Calculator

A portfolio-grade calculator built around a single idea: **light passing through stacked panes of glass**. Every panel — the calculator, the history drawer, the settings pane — shares one frosted-glass material, and every keypress sends a small refraction ripple across the glass it lands on.

No frameworks, no build step, no dependencies. Open `index.html` and it runs.

![Standard: JavaScript, HTML5, CSS3](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS-7C93FF)
![License: MIT](https://img.shields.io/badge/license-MIT-4FD1C5)

---

## Features

**Calculation**
- Standard arithmetic: add, subtract, multiply, divide
- Scientific mode: `sin`, `cos`, `tan`, `log`, `ln`, `√x`, `x²`, `xʸ`, `π`, `e`, `x!`, `1/x`
- Memory functions: `MC`, `MR`, `M+`, `M−`, `MS` with a persistent memory indicator
- Backspace, clear-entry (`CE`), and all-clear (`AC`)
- Division-by-zero and domain errors surface as a clear `Error` state instead of `NaN`/`Infinity`

**History**
- Every equals/function result is logged with its expression and timestamp
- Tap any entry to reload that result back into the calculator
- Persists across sessions via `localStorage`; "Clear all" wipes it instantly

**Themes**
- Four built-in glass themes: **Aurora** (default, indigo/teal), **Dawn** (warm amber), **Noir** (monochrome), **Mint** (cool teal/green)
- Theme choice is remembered on your next visit

**Settings**
- Toggle thousands separators in the result display
- Toggle sound feedback (generated tones, no audio files)
- Toggle reduced motion (disables the ripple and background drift animations)
- All settings persist locally

**Keyboard shortcuts**

| Key | Action |
|---|---|
| `0`–`9` | Digits |
| `.` | Decimal point |
| `+` `-` `*` `/` | Operators |
| `Enter` / `=` | Equals |
| `Backspace` | Delete last digit |
| `Esc` | All clear |
| `H` | Toggle history drawer |
| `S` | Toggle settings panel |

**Design & accessibility**
- Fully responsive, from small phones up through desktop
- Visible focus rings on every interactive element (`:focus-visible`)
- Respects `prefers-reduced-motion`, with an in-app override as well
- Semantic ARIA attributes on drawers, panels, and live regions

---

## Getting started

No installation required.

```bash
# Clone or unzip the project, then just open it:
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

Or serve it locally (recommended for consistent font loading):

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## Project structure

```
Advanced-Glassmorphism-Calculator/
├── index.html                 # Markup & structure
├── css/
│   └── style.css              # Design tokens, themes, layout, animation
├── js/
│   └── script.js              # Calculator engine, history, themes, settings
├── docs/
│   └── project-overview.md    # Architecture & design decisions
├── assets/
│   ├── logo.svg                # Brand mark
│   └── favicon.svg             # Browser tab icon
├── README.md
└── LICENSE
```

---

## Architecture at a glance

`js/script.js` is organized into small, single-purpose classes rather than one monolithic script:

- **`CalculatorEngine`** — pure state machine (no DOM access) that owns arithmetic, scientific functions, and error handling. Fully testable in isolation.
- **`HistoryStore`** — reads/writes calculation history to `localStorage`.
- **`ThemeManager`** — applies and persists the active theme.
- **`SettingsStore`** — persists user preferences (separators, motion, sound).
- **`SoundFeedback`** — generates short tones via the Web Audio API — no audio assets to load.
- **`UI`** — the only class that touches the DOM; wires the engine and stores to markup, handles events, keyboard shortcuts, and rendering.

See [`docs/project-overview.md`](docs/project-overview.md) for the full design rationale.

---

## Browser support

Built on modern, widely-supported CSS (`backdrop-filter`, `color-mix()`) and JavaScript (ES2020 classes, `localStorage`). Tested in current Chrome, Firefox, Safari, and Edge. A solid-color fallback is included for the rare browser without `color-mix()` support.

## License

MIT — see [`LICENSE`](LICENSE).
