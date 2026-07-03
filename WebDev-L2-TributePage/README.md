# Wings of Fire — A Tribute to Dr. A. P. J. Abdul Kalam

An interactive, single-page tribute site built for the **Oasis Infobyte Web Development Internship — Level 2, Task 2 (Tribute Page)**. The brief asked for a tribute page; this project treats it as an interactive editorial experience — a "flight log" that follows Dr. Kalam's path from Rameswaram to the Rashtrapati Bhavan and back to the classroom.

Live locally by opening `index.html` — no build step, no dependencies to install.

---

## Overview

The design is built around one recurring idea: a **trajectory arc**, echoing both "Missile Man" and *Wings of Fire*. It appears as a faint dashed arc behind the hero portrait, and again as a hand-drawn flight path that threads through the timeline, drawing itself in gold as you scroll.

The palette avoids the generic "AI dark mode" look on purpose — it's a deep night-navy paired with brass gold and ember orange (medals, launch flame, engineering blueprints), not a stock cyberpunk gradient. A light "parchment" theme is available via the toggle in the top right, and the choice persists across visits using `localStorage`.

## Features

- **Hero** — fullscreen intro with a canvas starfield, a blueprint grid, a parallax trajectory arc that responds to the mouse, and an illustrated silhouette portrait (no photographic assets are bundled — see *Assets* below).
- **Chapters of a Life** — six original biography cards (Rameswaram roots, education, ISRO, DRDO, presidency, teaching/legacy) with a soft 3D mouse-tilt and cursor-following glow.
- **Trajectory (Timeline)** — nine milestones (1931 → 2015) arranged along a curved SVG flight path whose gold stroke draws itself in sync with scroll position.
- **Honours & Instruments of a Legacy** — animated, count-up achievement cards (Bharat Ratna, Padma awards, books authored, honorary doctorates).
- **Gallery** — a responsive masonry grid of illustrated (SVG) panels with hover captions and a keyboard-accessible lightbox.
- **Quote** — a large glass quote card with an ambient glow and animated quotation marks.
- **Legacy** — closing section on what the life left behind, for students, science, and the republic.
- **Custom cursor** — a lagging ring + dot combo that expands over interactive elements (disabled automatically on touch devices).
- **Theme system** — dark "space" theme by default, light "parchment" theme on toggle, remembered via `localStorage`, and respects the visitor's OS preference on first visit.
- **Scroll system** — a top progress rail, an active-state side navigation, and `IntersectionObserver`-driven reveal animations throughout.
- **Accessibility** — semantic landmarks, a skip link, visible focus states, `aria-label`/`aria-pressed` on controls, keyboard-operable gallery, and full `prefers-reduced-motion` support (all animation is disabled/shortened automatically).
- **Fully responsive** — reflow-tested from small phones through desktop; the timeline collapses to a single left-aligned rail on narrow screens.

## Folder Structure

```
WebDev-L2-TributePage/
│
├── index.html              # Markup for every section
├── style.css                # Design tokens, layout, animation, responsive rules
├── script.js                 # Theme, cursor, reveal, tilt, trajectory draw, lightbox
├── README.md
├── LICENSE
│
├── assets/
│   ├── images/               # Reserved for photographic assets, if added later
│   ├── icons/                # Reserved for standalone icon assets
│   └── fonts/                # Reserved for local font files (Google Fonts are CDN-loaded by default)
│
├── docs/
│   └── project-overview.md   # Design rationale and token system
│
└── screenshots/               # Reserved for preview images
```

## Assets

This build ships **without photographic assets** — every visual (portrait, gallery panels, icons) is drawn with inline SVG and CSS so the project runs from a single `index.html` with zero external image requests, and so no likeness or third-party photography is used in a page about a real person. To use real photography instead, drop files into `assets/images/` and swap the relevant `<svg>` blocks in `index.html` for `<img>` tags — the CSS already accounts for both.

## Installation

1. Download or clone this folder.
2. Open `index.html` directly in any modern browser — Chrome, Firefox, Edge, or Safari.
3. No package manager, build tool, or server is required. (Optional: serve it with any static server, e.g. `npx serve .`, if you prefer not to use `file://` URLs.)

## Technologies

- **HTML5** — semantic sectioning, ARIA attributes
- **CSS3** — custom properties/design tokens, glassmorphism, CSS 3D transforms, `clip-path`-free SVG illustration, `IntersectionObserver`-driven reveal classes
- **Vanilla JavaScript (ES6+)** — no frameworks, no build step

## Future Improvements

- Swap illustrated gallery panels for archival photography with proper licensing and `srcset` responsive images.
- Add a table-of-contents "mission log" overlay summarizing all nine timeline waypoints for quick jumps.
- Localize copy into Hindi and Tamil.
- Add a print stylesheet for a single-page PDF version of the tribute.

## License

Released under the MIT License — see [`LICENSE`](./LICENSE).
