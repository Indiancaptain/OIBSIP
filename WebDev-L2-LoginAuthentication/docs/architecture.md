# Architecture

Cipher is a front-end-only authentication system. There is no server, no
database, and no network calls — every piece of state lives in the browser.
This document explains how the pieces fit together and why they're split
the way they are.

## Module boundaries

The app is split into three plain JavaScript modules, each with a single
responsibility, loaded in this order on every page:

```
storage.js  →  auth.js  →  ui.js  →  <page-specific inline script>
```

### `storage.js` — the only file that touches `localStorage`

Every read or write to `localStorage` / `sessionStorage` goes through this
module. No other file calls `localStorage.getItem` or `.setItem` directly.
That single choke point means:

- The storage *schema* (what keys exist, what shape the data is) lives in
  one place.
- Swapping localStorage for a real backend later means rewriting one file,
  not hunting through every page.

It exposes small, purpose-built functions instead of generic get/set —
`findUserByEmail`, `pushActivity`, `verifyResetToken` — so callers describe
*what* they want, not *how* it's stored.

### `auth.js` — business logic, no DOM

This module knows how to validate input, hash passwords, register and log
in users, manage sessions, and guard routes. It never touches the DOM. That
separation makes it possible to unit test the logic in isolation (open the
console on any page and call `Auth.passwordStrength("test")` directly) and
keeps the same rules consistent across every form in the app.

### `ui.js` — DOM/presentation only

Toasts, ripples, the theme switch, password-visibility toggles, and field
error rendering all live here. This module doesn't know what "logging in"
means — it just renders whatever `auth.js` and each page's inline script
tell it to.

### Page scripts

Each HTML file has a small inline `<script>` at the bottom that wires the
three modules together for that specific page: read form values, call
`Auth.*`, render results with `UI.*`. Keeping this glue code in the page
rather than in a shared file keeps each page's flow easy to read top to
bottom.

## Data model

```js
// storage: ciph.users → User[]
{
  fullName: "Jane Doe",
  username: "janedoe",
  email: "jane@example.com",
  salt: "…",            // random per-user salt, hex
  passwordHash: "…",    // SHA-256(salt + password), hex
  theme: "system",
  avatar: null,          // emoji string or null
  createdAt: 1735689600000
}

// storage: ciph.session (localStorage if "remember me", else sessionStorage)
{
  email: "jane@example.com",
  remember: true,
  issuedAt: 1735689600000,
  expiresAt: 1738281600000
}

// storage: ciph.resetTokens → { [email]: { token, expiresAt } }
// storage: ciph.activity    → { [email]: ActivityEntry[] }
```

## Session lifecycle

1. **Login** — `Auth.loginUser` verifies the password hash, then writes a
   session object with an expiry. "Remember me" decides whether that
   session lives in `localStorage` (survives closing the browser) or
   `sessionStorage` (cleared when the tab closes).
2. **Route protection** — `dashboard.html` and `profile.html` call
   `Auth.requireAuth()` as the very first script on the page. If there's no
   valid, unexpired session, the browser is redirected to `login.html`
   before any protected content renders.
3. **Guest-only pages** — `login.html`, `register.html`, and
   `forgot-password.html` call `Auth.redirectIfAuthed()` so an already
   signed-in user is bounced straight to their dashboard instead of seeing
   the login form again.
4. **Expiry** — every call to `Auth.getActiveSession()` checks the
   `expiresAt` timestamp and clears the session if it has passed, so an
   expired session behaves exactly like no session at all.
5. **Logout** — `Auth.logoutUser()` clears the session from both storages
   and records a "Signed out" activity entry.

## Password reset simulation

There's no email server, so the "forgot password" flow simulates one:

1. `Auth.generateResetToken(email)` creates a random token and stores it
   against the email with a 15-minute expiry.
2. Instead of emailing it, the app builds the exact URL a real email would
   contain (`reset-password.html?email=…&token=…`) and shows it directly
   in the UI, with a button to open it.
3. `reset-password.html` reads the query params, calls
   `Storage.verifyResetToken`, and only shows the form if the token is
   present, matches, and hasn't expired. Otherwise it shows an "expired
   link" state with a link back to request a new one.
4. On submit, the token is consumed (deleted) so it can't be reused.

## Why SHA-256 + salt instead of plain text

Storing plain-text passwords, even in a demo, is a bad habit worth not
practicing. Every registration generates a random 16-byte salt via
`crypto.getRandomValues`, and the password is hashed with
`crypto.subtle.digest("SHA-256", salt + password)` before it's ever written
to `localStorage`. This is genuinely better than plain text, but it is
still client-side and inspectable in DevTools — it's a demonstration of the
*pattern* real auth systems use (salt, then hash, never store the secret),
not a claim that this is production-grade security. A real system would do
this hashing on a server the user can't inspect, ideally with a slower,
purpose-built algorithm like bcrypt or argon2.

## Theming

Theme preference is stored under `ciph.theme` as `"light"`, `"dark"`, or
`"system"`. `UI.applyTheme` resolves `"system"` against
`prefers-color-scheme` at read time and sets `data-theme` on `<html>`,
which every color in `style.css` is derived from via CSS custom properties.
Changing the theme never requires re-rendering any component — it's a
single attribute flip that every already-rendered element responds to.
