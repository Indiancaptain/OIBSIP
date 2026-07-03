# Project Overview & Design Rationale

## Brief

Oasis Infobyte Web Development Internship, Level 2, Task 2: build a tribute page for a person of significance, using only HTML, CSS, and vanilla JavaScript, and satisfying a standard checklist (title, tagline, hero image, biography, timeline, quote, multiple sections, responsive design). This build treats that checklist as a floor, not a ceiling.

## Subject

**Dr. A. P. J. Abdul Kalam** — aerospace engineer, ISRO/DRDO scientist, 11th President of India, author, and teacher. Chosen for a life that naturally supplies a strong visual through-line: flight, trajectory, orbit, and the idea of a "mission."

## Design Plan (token system)

**Color**
| Token | Value | Role |
|---|---|---|
| `--bg-deep` | `#0B1120` | Base night-navy background (dark theme) |
| `--bg-panel` | `#121B2E` | Card/panel surfaces |
| `--accent-gold` | `#C9A227` | Primary accent — brass/medal gold |
| `--accent-gold-soft` | `#E4C862` | Gradient partner, headline accent |
| `--accent-ember` | `#E2672B` | Secondary accent — rocket-flame ember |
| `--bg-deep` (light) | `#F6F1E4` | Parchment background (light theme) |

Deliberately avoids the two most common "AI-generated" defaults: warm cream + terracotta, and near-black + single neon accent. The gold/ember pairing is drawn from *specific* source material — medals (Bharat Ratna, Padma awards) and rocket exhaust — rather than a generic "premium dark" palette.

**Type**
- Display: **Fraunces** — a high-contrast serif with enough weight range to read as editorial/ceremonial without becoming a stock "elegant serif."
- Body: **Inter** — a neutral, highly legible workhorse for long-form biography text.
- Utility/data: **JetBrains Mono** — used for years, eyebrows, and captions, echoing engineering annotation and control-room readouts, which ties back to the blueprint/mission-log motif.

**Layout**
- Hero: asymmetric — headline block anchored left, an illustrated portrait silhouette bottom-right, a blueprint grid and a dashed trajectory arc in the background layer.
- Chapters: responsive card grid, 3D mouse-tilt glass panels.
- Timeline: a *curved* SVG flight path (not a straight vertical line) with waypoints alternating left/right, echoing a mission trajectory readout rather than a generic numbered list.
- Gallery: masonry grid of illustrated panels rather than stock photography.

**Signature element**
The **trajectory arc** — a hand-authored SVG path that (a) sits faintly behind the hero portrait and reacts to mouse movement, and (b) reappears at full scale through the timeline section, where its gold stroke draws itself in as the visitor scrolls (via `stroke-dashoffset`), acting simultaneously as a scroll-progress indicator and a thematic thread connecting "Missile Man," *Wings of Fire*, and the shape of a life that kept changing altitude.

## Self-critique pass

- Removed an initially-planned full-page scroll-synced arc (hero → footer) in favor of a scoped version (hero background + timeline) — the full-page version added complexity without adding meaning once the timeline already carried the motif clearly.
- Numbered markers (01/02/03) were considered for the chapter cards and rejected — the six chapters are not a strict numbered sequence in the reader's mental model (they're read as themes), whereas the *timeline* genuinely is chronological, so waypoint years are the only place numeric ordering appears.
- Photography was deliberately replaced with illustrated SVG panels: this keeps the project dependency-free (opens directly from `index.html` with no external image requests) and avoids using a real person's likeness in stock/unlicensed imagery.

## Accessibility & performance notes

- All decorative SVG/canvas elements are `aria-hidden`.
- Reveal, tilt, cursor, and starfield animations are all gated behind a single `prefers-reduced-motion` check.
- The custom cursor is automatically disabled on touch/coarse-pointer devices.
- No web fonts block render meaningfully — `Fraunces`/`Inter`/`JetBrains Mono` are loaded via `<link rel="preconnect">` + a single stylesheet request.
- No layout-shifting images: all visuals are vector, sized via CSS.
