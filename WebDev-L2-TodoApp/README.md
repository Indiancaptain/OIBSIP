# Arclight — a premium task workspace

**Oasis Infobyte Web Development Internship — Level 2, Task 3 (To‑Do List App)**

Arclight reimagines the internship's to‑do list brief as a small productivity workspace built entirely with HTML5, CSS3, and vanilla JavaScript — no frameworks, no build step, no dependencies. Open `index.html` and it runs.

The idea behind the design: a day has a shape, rising and falling like an arc from sunrise to sunset. Arclight's signature element — **the Day Arc** — plots your tasks along that shape and fills in as you complete them, instead of the generic circular progress ring most task apps default to.

---

## Overview

Arclight is a single-page application with no backend. All data — tasks, custom categories, and theme preference — is stored in the browser via `localStorage`, so your workspace persists between visits on the same device and browser.

It satisfies every core internship requirement (create, edit, delete, and complete tasks; persistent storage; a polished, responsive UI) and then goes considerably further: due dates and times, priorities, tags, categories, drag‑and‑drop reordering, multi‑select bulk actions, a mini calendar, weekly statistics, four hand‑built themes, toast notifications with undo, and keyboard shortcuts.

## Features

**Core (internship requirements)**
- Create, edit, and delete tasks
- Mark tasks complete / incomplete (with one‑click undo)
- Tasks persist permanently via `localStorage`
- Polished, responsive UI down to small mobile screens

**Task management**
- Rich task details: title, description, category, priority, due date & time, tags, time estimate, notes
- Duplicate, archive, and restore tasks
- Drag‑and‑drop manual reordering
- Multi‑select mode with bulk complete / bulk delete
- Quick‑add bar that understands inline `#tags` while typing

**Organization & discovery**
- Filters: Today, Tomorrow, This week, Overdue, Pending, Completed, Archive
- Filter by priority and by category, from the sidebar or toolbar
- Instant search with match highlighting
- Sort by manual order, due date, priority, date created, or alphabetically
- Mini calendar with task‑day indicators; click a day to filter by it

**Insight**
- The Day Arc: today's completion plotted as an arc, with a moving marker for the current time of day and dots for each task at its due time
- Weekly completion chart and live stats (created / completed / pending)
- Category breakdown bars

**Feel**
- Four built‑in themes — Daybreak, Dusk, Midnight, Ocean — saved automatically
- Toast notifications for every action, several with an Undo action
- Button ripple, hover‑lift, magnetic floating action button, glassy header card
- Full keyboard support: `/` to search, `n` for a new task, `Esc` to close dialogs, visible focus rings throughout
- Semantic HTML and ARIA labelling for screen readers; reduced‑motion is respected

## Screenshots

Add your own screenshots to the `screenshots/` folder when you package this project — for example `dashboard-dusk.png`, `dashboard-light.png`, `task-modal.png`, and `mobile.png` — and reference them here:

```md
![Dashboard — Dusk theme](screenshots/dashboard-dusk.png)
![Task detail modal](screenshots/task-modal.png)
```

## Folder structure

```
WebDev-L2-TodoApp/
├── index.html            Markup for the whole app (single page)
├── style.css              Design tokens, themes, layout, components, motion
├── script.js               Application logic (state, rendering, storage, events)
├── README.md
├── LICENSE
├── assets/
│   ├── icons/              (icons are inline SVG in the markup — folder kept for future assets)
│   ├── sounds/              (reserved for optional sound feedback)
│   └── images/              (reserved for future imagery)
├── docs/
│   └── architecture.md    How the app is put together, and why
└── screenshots/            Drop your own screenshots here before packaging
```

## Installation

No build tools, no `npm install`, no server required.

1. Download or clone this folder.
2. Open `index.html` directly in any modern browser (Chrome, Firefox, Safari, Edge).

That's it — the app is fully client‑side.

> Optional: for the nicest typography, keep an internet connection on first load so the Google Fonts (Fraunces, Inter, IBM Plex Mono) can load. Arclight falls back gracefully to system fonts if they're unavailable.

## Usage

- **Add a task** — type into the quick‑add bar at the top and press Enter, or click "Details…" / the floating **+** button for the full form.
- **Complete a task** — click the circle on the left of a task card. A toast appears with an Undo option.
- **Edit a task** — click anywhere on a task's text to open it in the editor.
- **Reorder** — drag the handle that appears on hover, only available while sorting manually.
- **Bulk actions** — click the checkmark icon in the toolbar to enter select mode, tick tasks, then complete or delete them together.
- **Filter & search** — use the sidebar, the filter chips, the priority/category dropdowns, or the search box (press `/`).
- **Switch themes** — pick a dot at the bottom of the sidebar: Daybreak, Dusk, Midnight, or Ocean.
- **Calendar** — click any day in the mini calendar to see tasks due that day.

## Future improvements

- Optional cloud sync (e.g. a small backend or Firebase) so a workspace can follow you across devices
- Recurring tasks and reminders with browser notifications
- Subtasks / checklists within a task
- Drag‑and‑drop between categories directly from the sidebar
- Export / import tasks as JSON or `.ics`
- Optional sound feedback on complete (folder reserved at `assets/sounds/`)

## License

Released under the MIT License — see [LICENSE](LICENSE).

---

Built for the Oasis Infobyte Web Development Internship, Level 2 — Task 3.
