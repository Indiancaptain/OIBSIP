# Cipher — Advanced Login Authentication System

> Oasis Infobyte · Web Development Internship · **Level 2 · Task 4**

A premium, fully front-end authentication experience — registration, login,
logout, session management, password recovery, and a real dashboard —
built with nothing but **HTML5, CSS3, and vanilla JavaScript**. No
frameworks, no backend, no build step. Open `index.html` and it works.

Live data lives entirely in your browser's `localStorage`, with passwords
salted and hashed via the Web Crypto API before they're ever stored.

---

## ✨ Features

**Authentication**
- Registration with real-time validation and a live password-strength meter
- Login with "remember me" (30-day session) or standard session (12 hours,
  cleared when the tab closes)
- Logout from the dashboard or profile page
- Simulated forgot-password → reset-password flow with expiring, single-use
  tokens
- Change password from the profile page (requires current password)
- Duplicate email/username prevention
- Session expiry + automatic route protection (`requireAuth`) and
  guest-only redirects (`redirectIfAuthed`)

**Experience**
- Split-screen login/register layout with an animated, live-updating
  "session ledger" — a signature UI element that visualizes what the
  system is actually doing (issuing tokens, hashing passwords, guarding
  routes) instead of a generic illustration
- Full light/dark/system theming, persisted per user
- Floating toast notifications, button ripples, loading states, and a
  password-strength meter with a live checklist
- Dashboard with account statistics, a recent-activity feed, and quick
  actions
- Editable profile with an emoji avatar picker
- Fully responsive: desktop, laptop, tablet, and mobile
- Accessible: semantic landmarks, ARIA attributes on interactive controls,
  visible focus states, `prefers-reduced-motion` support, and a skip link

**Engineering**
- Three cleanly separated modules — `storage.js` (persistence),
  `auth.js` (logic, zero DOM references), `ui.js` (presentation) — see
  [`docs/architecture.md`](docs/architecture.md) for the full breakdown
- Passwords are never stored in plain text: each user gets a random salt,
  hashed with SHA-256 via `crypto.subtle`
- No inline duplicate logic — every page reuses the same three modules

---

## 📁 Folder structure

```
WebDev-L2-LoginAuthentication/
│
├── index.html              # Entry point — routes to login or dashboard
├── login.html               # Sign-in screen
├── register.html            # Account creation
├── forgot-password.html     # Request a reset link (simulated)
├── reset-password.html      # Consume a reset link, set a new password
├── dashboard.html            # Protected: stats, activity, quick actions
├── profile.html              # Protected: edit profile, theme, password
│
├── style.css                 # Full design system + every component
├── storage.js                 # localStorage/sessionStorage data layer
├── auth.js                    # Validation, hashing, sessions, route guards
├── ui.js                       # Toasts, theming, ripples, field UI
│
├── README.md
├── LICENSE
│
├── assets/
│   ├── icons/
│   ├── images/
│   └── avatars/
│
├── docs/
│   └── architecture.md        # How the modules fit together
│
└── screenshots/
```

---

## 🚀 Installation & usage

No build tools, no `npm install`, no server required.

1. Download or clone this folder.
2. Open `index.html` directly in any modern browser — or, for the best
   experience (some browsers restrict `crypto.subtle` on the `file://`
   protocol), serve it locally:
   ```bash
   npx serve .
   # or
   python3 -m http.server 5500
   ```
3. Create an account on the register page, then explore the dashboard and
   profile.

**Try the full flow:**
1. Register a new account → you're signed in automatically.
2. Sign out from the dashboard.
3. Go to **Forgot password** → generate a simulated reset link → open it →
   set a new password.
4. Sign back in with the new password.
5. Visit **Profile** to change your avatar, theme, or password.

> All data is local to your browser. Clearing site data / localStorage
> will remove every account created in the demo.

---

## 🛠️ Technologies

| Layer | Choice |
|---|---|
| Structure | Semantic HTML5 |
| Styling | CSS3 — custom properties, Grid, Flexbox, no framework |
| Behavior | Vanilla JavaScript (ES2017+), no libraries |
| Persistence | `localStorage` / `sessionStorage` |
| Security | Web Crypto API (`crypto.subtle`, SHA-256, per-user salt) |
| Fonts | Space Grotesk (display), Inter (body), JetBrains Mono (data) |

---

## 🔒 A note on security

This is a learning project with no backend, so "security" here means the
patterns a real system uses, implemented honestly on the client:

- Passwords are salted and hashed with SHA-256 before storage — never kept
  in plain text.
- Sessions expire and are checked on every protected page load.
- Reset tokens are random, time-limited, and single-use.

That said, everything is still stored and computed in the user's own
browser and is inspectable via DevTools. This should be read as a
demonstration of authentication *concepts*, not used as-is to protect real
user data — a production system needs a server-side authority the client
can't see or tamper with.

---

## 🔭 Future improvements

- Real backend (Node/Express + a database) with hashed passwords stored
  server-side (bcrypt/argon2) instead of client-side SHA-256
- Actual email delivery for password resets
- Multi-factor authentication (TOTP)
- OAuth / social login providers
- Account deletion and data export
- Rate limiting on login attempts

---

## 📄 License

Released under the [MIT License](LICENSE).
