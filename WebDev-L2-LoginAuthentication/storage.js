/**
 * storage.js
 * ---------------------------------------------------------------------------
 * Single source of truth for every piece of persisted state in the app.
 * Nothing outside this file should call localStorage / sessionStorage
 * directly — that keeps the storage schema in one place and makes it easy
 * to change later (e.g. swap localStorage for a real API).
 *
 * Keys are namespaced under "ciph." (short for "cipher", the product name
 * used across the UI copy) to avoid clashing with anything else on the
 * origin.
 * ---------------------------------------------------------------------------
 */

const Storage = (() => {
  const KEYS = {
    USERS: "ciph.users",
    SESSION: "ciph.session",
    THEME: "ciph.theme",
    RESET_TOKENS: "ciph.resetTokens",
    ACTIVITY: "ciph.activity", // per-user recent activity log, keyed by email
  };

  /* ---------------------------- low level ------------------------------ */

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      console.error(`Storage: failed to read "${key}"`, err);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.error(`Storage: failed to write "${key}"`, err);
      return false;
    }
  }

  /* ------------------------------ users --------------------------------- */

  function getUsers() {
    return read(KEYS.USERS, []);
  }

  function saveUsers(users) {
    return write(KEYS.USERS, users);
  }

  function findUserByEmail(email) {
    if (!email) return null;
    const target = email.trim().toLowerCase();
    return getUsers().find((u) => u.email.toLowerCase() === target) || null;
  }

  function findUserByUsername(username) {
    if (!username) return null;
    const target = username.trim().toLowerCase();
    return getUsers().find((u) => u.username.toLowerCase() === target) || null;
  }

  function findUserByIdentifier(identifier) {
    return findUserByEmail(identifier) || findUserByUsername(identifier);
  }

  function addUser(user) {
    const users = getUsers();
    users.push(user);
    return saveUsers(users);
  }

  function updateUser(email, updates) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
    if (idx === -1) return false;
    users[idx] = { ...users[idx], ...updates };
    saveUsers(users);
    return users[idx];
  }

  /* ------------------------------ session -------------------------------- */

  // "remember me" sessions live in localStorage (survive browser restarts);
  // short sessions live in sessionStorage (cleared when the tab closes).

  function setSession(session) {
    if (session.remember) {
      localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
      sessionStorage.removeItem(KEYS.SESSION);
    } else {
      sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
      localStorage.removeItem(KEYS.SESSION);
    }
  }

  function getSession() {
    const fromSession = sessionStorage.getItem(KEYS.SESSION);
    if (fromSession) return JSON.parse(fromSession);
    const fromLocal = localStorage.getItem(KEYS.SESSION);
    if (fromLocal) return JSON.parse(fromLocal);
    return null;
  }

  function clearSession() {
    localStorage.removeItem(KEYS.SESSION);
    sessionStorage.removeItem(KEYS.SESSION);
  }

  /* ------------------------------- theme ---------------------------------- */

  function getTheme() {
    return localStorage.getItem(KEYS.THEME) || null;
  }

  function setTheme(theme) {
    localStorage.setItem(KEYS.THEME, theme);
  }

  /* --------------------------- reset tokens -------------------------------- */
  // Simulates the token a real backend would email to the user. Tokens expire
  // after 15 minutes and are single-use.

  function getResetTokens() {
    return read(KEYS.RESET_TOKENS, {});
  }

  function setResetToken(email, token) {
    const tokens = getResetTokens();
    tokens[email.toLowerCase()] = {
      token,
      expiresAt: Date.now() + 15 * 60 * 1000,
    };
    write(KEYS.RESET_TOKENS, tokens);
  }

  function verifyResetToken(email, token) {
    const tokens = getResetTokens();
    const entry = tokens[email.toLowerCase()];
    if (!entry) return false;
    if (entry.token !== token) return false;
    if (Date.now() > entry.expiresAt) return false;
    return true;
  }

  function clearResetToken(email) {
    const tokens = getResetTokens();
    delete tokens[email.toLowerCase()];
    write(KEYS.RESET_TOKENS, tokens);
  }

  /* ------------------------------ activity --------------------------------- */

  function getActivity(email) {
    const all = read(KEYS.ACTIVITY, {});
    return all[email.toLowerCase()] || [];
  }

  function pushActivity(email, entry) {
    const all = read(KEYS.ACTIVITY, {});
    const key = email.toLowerCase();
    const list = all[key] || [];
    list.unshift({ ...entry, at: Date.now() });
    all[key] = list.slice(0, 12); // keep the most recent 12 events
    write(KEYS.ACTIVITY, all);
  }

  return {
    KEYS,
    getUsers,
    saveUsers,
    findUserByEmail,
    findUserByUsername,
    findUserByIdentifier,
    addUser,
    updateUser,
    setSession,
    getSession,
    clearSession,
    getTheme,
    setTheme,
    setResetToken,
    verifyResetToken,
    clearResetToken,
    getActivity,
    pushActivity,
  };
})();
