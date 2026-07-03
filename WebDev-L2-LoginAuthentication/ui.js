/**
 * ui.js
 * ---------------------------------------------------------------------------
 * Shared, presentation-only helpers used across every page: theme switching,
 * toast notifications, button ripples, password-visibility toggles, field
 * error rendering, and the animated "session ledger" ticker used on the
 * auth screens' marketing panel.
 * ---------------------------------------------------------------------------
 */

const UI = (() => {
  /* -------------------------------- theme ----------------------------------- */

  function applyTheme(theme) {
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    document.documentElement.setAttribute("data-theme", resolved);
  }

  function initTheme() {
    const stored = Storage.getTheme() || "system";
    applyTheme(stored);

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if ((Storage.getTheme() || "system") === "system") applyTheme("system");
    });

    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      syncThemeToggleLabel(btn);
      btn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        Storage.setTheme(next);
        applyTheme(next);
        syncThemeToggleLabel(btn);
      });
    });
  }

  function syncThemeToggleLabel(btn) {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    btn.setAttribute("aria-pressed", String(isDark));
    const label = btn.querySelector("[data-theme-label]");
    if (label) label.textContent = isDark ? "Dark" : "Light";
  }

  /* -------------------------------- toasts ------------------------------------ */

  function ensureToastHost() {
    let host = document.querySelector(".toast-host");
    if (!host) {
      host = document.createElement("div");
      host.className = "toast-host";
      host.setAttribute("aria-live", "polite");
      host.setAttribute("role", "status");
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, type = "info", duration = 4200) {
    const host = ensureToastHost();
    const el = document.createElement("div");
    el.className = `toast toast--${type}`;
    const icons = { success: "✓", error: "!", info: "•" };
    el.innerHTML = `<span class="toast__icon">${icons[type] || icons.info}</span><span class="toast__msg"></span>`;
    el.querySelector(".toast__msg").textContent = message;
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast--in"));

    const remove = () => {
      el.classList.remove("toast--in");
      el.addEventListener("transitionend", () => el.remove(), { once: true });
    };
    const timer = setTimeout(remove, duration);
    el.addEventListener("click", () => {
      clearTimeout(timer);
      remove();
    });
  }

  /* --------------------------------- ripple ------------------------------------ */

  function initRipples() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 1.6;
      ripple.className = "btn__ripple";
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  }

  /* ---------------------------- password visibility ------------------------------ */

  function initPasswordToggles() {
    document.querySelectorAll("[data-password-toggle]").forEach((btn) => {
      const targetId = btn.getAttribute("data-password-toggle");
      const input = document.getElementById(targetId);
      if (!input) return;
      btn.addEventListener("click", () => {
        const showing = input.type === "text";
        input.type = showing ? "password" : "text";
        btn.setAttribute("aria-label", showing ? "Show password" : "Hide password");
        btn.classList.toggle("is-active", !showing);
      });
    });
  }

  /* -------------------------------- field errors ---------------------------------- */

  function setFieldError(inputEl, message) {
    const group = inputEl.closest(".field");
    if (!group) return;
    const errorEl = group.querySelector(".field__error");
    group.classList.toggle("field--error", !!message);
    inputEl.setAttribute("aria-invalid", message ? "true" : "false");
    if (errorEl) errorEl.textContent = message || "";
  }

  function clearFieldError(inputEl) {
    setFieldError(inputEl, "");
  }

  /* ------------------------------- loading buttons ---------------------------------- */

  function setButtonLoading(btn, loading, loadingText) {
    if (loading) {
      btn.dataset.originalText = btn.dataset.originalText || btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("btn--loading");
      btn.innerHTML = `<span class="spinner" aria-hidden="true"></span><span>${loadingText || "Please wait…"}</span>`;
    } else {
      btn.disabled = false;
      btn.classList.remove("btn--loading");
      if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
    }
  }

  /* ------------------------------ session ledger ticker ----------------------------- */
  // A small ambient log that reinforces the "authentication system" theme on
  // the marketing panel of the auth screens. Purely decorative + simulated.

  const LEDGER_EVENTS = [
    { tag: "AUTH", text: "Session token issued · 256-bit" },
    { tag: "HASH", text: "Password salted + hashed · SHA-256" },
    { tag: "GUARD", text: "Route guard verified for /dashboard" },
    { tag: "AUTH", text: "Device fingerprint matched" },
    { tag: "SYNC", text: "Preferences synced to profile" },
    { tag: "GUARD", text: "Unauthorized request blocked" },
    { tag: "AUTH", text: "Refresh token rotated" },
    { tag: "HASH", text: "Reset token expired · discarded" },
  ];

  function initLedger(mountSelector) {
    const mount = document.querySelector(mountSelector);
    if (!mount) return;
    let i = 0;
    function addLine() {
      const event = LEDGER_EVENTS[i % LEDGER_EVENTS.length];
      i += 1;
      const line = document.createElement("div");
      line.className = "ledger__line";
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      line.innerHTML = `<span class="ledger__time">${time}</span><span class="ledger__tag">${event.tag}</span><span class="ledger__text">${event.text}</span>`;
      mount.appendChild(line);
      requestAnimationFrame(() => line.classList.add("ledger__line--in"));
      while (mount.children.length > 6) mount.removeChild(mount.firstChild);
    }
    addLine();
    return setInterval(addLine, 2600);
  }

  /* ------------------------------- mobile nav / misc --------------------------------- */

  function initYear() {
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = new Date().getFullYear();
    });
  }

  function formatRelativeTime(timestamp) {
    const diff = Date.now() - timestamp;
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  function initAll() {
    initTheme();
    initRipples();
    initPasswordToggles();
    initYear();
  }

  return {
    applyTheme,
    initTheme,
    toast,
    initRipples,
    initPasswordToggles,
    setFieldError,
    clearFieldError,
    setButtonLoading,
    initLedger,
    initYear,
    formatRelativeTime,
    initAll,
  };
})();

document.addEventListener("DOMContentLoaded", () => UI.initAll());
