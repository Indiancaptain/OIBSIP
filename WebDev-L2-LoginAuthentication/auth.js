/**
 * auth.js
 * ---------------------------------------------------------------------------
 * All authentication logic: validation rules, password hashing (via the
 * browser's native Web Crypto API — SHA-256 with a per-user random salt),
 * registration, login, logout, session lifecycle, and route protection.
 *
 * IMPORTANT — HONEST SECURITY NOTE
 * This is a front-end-only demo built for the Oasis Infobyte internship.
 * There is no server, so "authentication" here means: hash + salt the
 * password before it ever touches localStorage, never store it in plain
 * text, and gate pages with a session check. That is meaningfully better
 * than storing plain text passwords, but it is still client-side and
 * inspectable — it should not be treated as production-grade security.
 * ---------------------------------------------------------------------------
 */

const Auth = (() => {
  const SESSION_HOURS = 12; // how long a normal (non "remember me") session lasts
  const REMEMBER_DAYS = 30; // how long a "remember me" session lasts

  /* ----------------------------- validation ------------------------------ */

  const RULES = {
    fullName: /^[A-Za-z][A-Za-z\s'-]{1,49}$/,
    username: /^[a-zA-Z0-9_]{3,20}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  };

  function validateFullName(value) {
    if (!value || !value.trim()) return "Enter your full name.";
    if (!RULES.fullName.test(value.trim())) {
      return "Use 2–50 letters only (spaces, apostrophes, and hyphens are fine).";
    }
    return "";
  }

  function validateUsername(value) {
    if (!value || !value.trim()) return "Choose a username.";
    if (!RULES.username.test(value.trim())) {
      return "3–20 characters: letters, numbers, and underscores only.";
    }
    return "";
  }

  function validateEmail(value) {
    if (!value || !value.trim()) return "Enter your email address.";
    if (!RULES.email.test(value.trim())) return "Enter a valid email address.";
    return "";
  }

  // Returns { score: 0-4, label, checks: {length, lower, upper, number, symbol} }
  function passwordStrength(value) {
    const checks = {
      length: value.length >= 8,
      lower: /[a-z]/.test(value),
      upper: /[A-Z]/.test(value),
      number: /[0-9]/.test(value),
      symbol: /[^A-Za-z0-9]/.test(value),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    // Map 0-5 passed checks onto a 0-4 score.
    let score = 0;
    if (!value) score = 0;
    else if (passed <= 2) score = 1;
    else if (passed === 3) score = 2;
    else if (passed === 4) score = 3;
    else score = 4;

    const labels = ["Empty", "Weak", "Fair", "Good", "Strong"];
    return { score, label: labels[score], checks };
  }

  function validatePassword(value) {
    if (!value) return "Create a password.";
    if (value.length < 8) return "Use at least 8 characters.";
    const { score } = passwordStrength(value);
    if (score < 2) return "Add uppercase letters, numbers, or symbols to strengthen it.";
    return "";
  }

  function validateConfirmPassword(password, confirm) {
    if (!confirm) return "Confirm your password.";
    if (password !== confirm) return "Passwords don't match.";
    return "";
  }

  /* ------------------------------ hashing --------------------------------- */

  function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  function randomSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bufferToHex(bytes.buffer);
  }

  async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(salt + password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return bufferToHex(digest);
  }

  /* ----------------------------- registration ------------------------------ */

  async function registerUser({ fullName, username, email, password }) {
    const existingEmail = Storage.findUserByEmail(email);
    if (existingEmail) {
      return { ok: false, field: "email", message: "An account with this email already exists." };
    }
    const existingUsername = Storage.findUserByUsername(username);
    if (existingUsername) {
      return { ok: false, field: "username", message: "That username is taken." };
    }

    const salt = randomSalt();
    const passwordHash = await hashPassword(password, salt);

    const user = {
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      salt,
      passwordHash,
      theme: "system",
      avatar: null,
      createdAt: Date.now(),
    };

    Storage.addUser(user);
    Storage.pushActivity(user.email, { type: "register", label: "Account created" });
    return { ok: true, user };
  }

  /* -------------------------------- login ---------------------------------- */

  async function loginUser({ identifier, password, remember }) {
    const user = Storage.findUserByIdentifier(identifier);
    if (!user) {
      return { ok: false, field: "identifier", message: "No account matches that email or username." };
    }
    const attemptHash = await hashPassword(password, user.salt);
    if (attemptHash !== user.passwordHash) {
      return { ok: false, field: "password", message: "Incorrect password. Try again." };
    }

    const now = Date.now();
    const durationMs = remember ? REMEMBER_DAYS * 24 * 60 * 60 * 1000 : SESSION_HOURS * 60 * 60 * 1000;
    const session = {
      email: user.email,
      remember: !!remember,
      issuedAt: now,
      expiresAt: now + durationMs,
    };
    Storage.setSession(session);
    Storage.pushActivity(user.email, { type: "login", label: "Signed in" });
    return { ok: true, user };
  }

  function logoutUser() {
    const user = getCurrentUser();
    if (user) Storage.pushActivity(user.email, { type: "logout", label: "Signed out" });
    Storage.clearSession();
  }

  /* -------------------------------- session --------------------------------- */

  function getActiveSession() {
    const session = Storage.getSession();
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      Storage.clearSession();
      return null;
    }
    return session;
  }

  function getCurrentUser() {
    const session = getActiveSession();
    if (!session) return null;
    return Storage.findUserByEmail(session.email);
  }

  function isAuthenticated() {
    return !!getActiveSession();
  }

  // Call at the top of protected pages (dashboard, profile).
  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.replace("login.html");
      return null;
    }
    return getCurrentUser();
  }

  // Call at the top of guest-only pages (login, register) so a signed-in
  // user is bounced straight to their dashboard.
  function redirectIfAuthed() {
    if (isAuthenticated()) {
      window.location.replace("dashboard.html");
      return true;
    }
    return false;
  }

  /* --------------------------- password reset -------------------------------- */

  function generateResetToken(email) {
    const bytes = new Uint8Array(9);
    crypto.getRandomValues(bytes);
    const token = bufferToHex(bytes.buffer);
    Storage.setResetToken(email, token);
    return token;
  }

  async function completePasswordReset({ email, token, newPassword }) {
    if (!Storage.verifyResetToken(email, token)) {
      return { ok: false, message: "This reset link is invalid or has expired." };
    }
    const user = Storage.findUserByEmail(email);
    if (!user) return { ok: false, message: "We couldn't find that account." };

    const salt = randomSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    Storage.updateUser(user.email, { salt, passwordHash });
    Storage.clearResetToken(email);
    Storage.pushActivity(user.email, { type: "reset", label: "Password reset" });
    return { ok: true };
  }

  // For a logged-in user changing their password from the profile page
  // (as opposed to the forgot-password token flow).
  async function changePassword(email, currentPassword, newPassword) {
    const user = Storage.findUserByEmail(email);
    if (!user) return { ok: false, field: "current", message: "We couldn't find that account." };

    const currentHash = await hashPassword(currentPassword, user.salt);
    if (currentHash !== user.passwordHash) {
      return { ok: false, field: "current", message: "Current password is incorrect." };
    }

    const salt = randomSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    Storage.updateUser(user.email, { salt, passwordHash });
    Storage.pushActivity(user.email, { type: "reset", label: "Password changed" });
    return { ok: true };
  }

  return {
    validateFullName,
    validateUsername,
    validateEmail,
    validatePassword,
    validateConfirmPassword,
    passwordStrength,
    registerUser,
    loginUser,
    logoutUser,
    getActiveSession,
    getCurrentUser,
    isAuthenticated,
    requireAuth,
    redirectIfAuthed,
    generateResetToken,
    completePasswordReset,
    changePassword,
  };
})();
