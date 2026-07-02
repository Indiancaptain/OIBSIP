/*!
 * Refract — Advanced Glassmorphism Calculator
 * Vanilla JS, no dependencies.
 * Modules: CalculatorEngine, HistoryStore, ThemeManager, SettingsStore,
 *          SoundFeedback, UI (wires everything to the DOM).
 */
(function () {
  "use strict";

  /* ===========================================================
     Utilities
     =========================================================== */
  const STORAGE_KEYS = {
    history: "refract:history",
    theme: "refract:theme",
    settings: "refract:settings",
    memory: "refract:memory",
    mode: "refract:mode",
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeParse(json, fallback) {
    try {
      const val = JSON.parse(json);
      return val === null || val === undefined ? fallback : val;
    } catch (e) {
      return fallback;
    }
  }

  function loadFromStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;
      return safeParse(raw, fallback);
    } catch (e) {
      // localStorage unavailable (private mode / disabled) — fail soft
      return fallback;
    }
  }

  function saveToStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* ignore quota / availability errors */
    }
  }

  /** Format a finite number for display without losing precision unnecessarily. */
  function formatNumber(value, useSeparators) {
    if (value === null || value === undefined || Number.isNaN(value)) return "Error";
    if (!Number.isFinite(value)) return "Error";

    // Guard against floating point noise, e.g. 0.1 + 0.2
    let rounded = value;
    if (Math.abs(value) < 1e15) {
      rounded = Math.round((value + Number.EPSILON) * 1e10) / 1e10;
    }

    const abs = Math.abs(rounded);
    let str;

    if (abs !== 0 && (abs >= 1e15 || abs < 1e-9)) {
      str = rounded.toExponential(6).replace(/\.?0+e/, "e");
    } else {
      str = String(rounded);
      // Trim excessive decimal length for display
      if (str.includes(".")) {
        const [intPart, decPart] = str.split(".");
        const trimmedDec = decPart.slice(0, 10).replace(/0+$/, "");
        str = trimmedDec.length ? `${intPart}.${trimmedDec}` : intPart;
      }
    }

    if (useSeparators && !str.includes("e")) {
      const negative = str.startsWith("-");
      if (negative) str = str.slice(1);
      const [intPart, decPart] = str.split(".");
      const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      str = decPart ? `${withSep}.${decPart}` : withSep;
      if (negative) str = `-${str}`;
    }

    return str;
  }

  function factorial(n) {
    if (n < 0 || !Number.isInteger(n)) return NaN;
    if (n > 170) return Infinity; // overflow guard
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  }

  /* ===========================================================
     CalculatorEngine — pure state machine, no DOM
     =========================================================== */
  class CalculatorEngine {
    constructor() {
      this.reset();
    }

    reset() {
      this.current = "0";
      this.previous = null;
      this.operator = null;
      this.waitingForOperand = false;
      this.expression = "";
      this.lastAction = null;
      this.error = false;
    }

    clearEntry() {
      if (this.error) { this.reset(); return; }
      this.current = "0";
      this.waitingForOperand = false;
    }

    inputDigit(digit) {
      if (this.error) this.reset();
      if (this.waitingForOperand) {
        this.current = digit === "." ? "0." : digit;
        this.waitingForOperand = false;
      } else if (this.current === "0" && digit !== ".") {
        this.current = digit;
      } else {
        if (this.current.replace(/[-.]/g, "").length >= 16) return; // digit cap
        this.current += digit;
      }
    }

    inputDecimal() {
      if (this.error) this.reset();
      if (this.waitingForOperand) {
        this.current = "0.";
        this.waitingForOperand = false;
        return;
      }
      if (!this.current.includes(".")) this.current += ".";
    }

    toggleSign() {
      if (this.error) return;
      if (this.current === "0") return;
      this.current = this.current.startsWith("-") ? this.current.slice(1) : `-${this.current}`;
    }

    backspace() {
      if (this.error) { this.reset(); return; }
      if (this.waitingForOperand) return;
      if (this.current.length <= 1 || (this.current.length === 2 && this.current.startsWith("-"))) {
        this.current = "0";
      } else {
        this.current = this.current.slice(0, -1);
      }
    }

    static applyOp(a, b, op) {
      switch (op) {
        case "+": return a + b;
        case "-": return a - b;
        case "*": return a * b;
        case "/": return b === 0 ? NaN : a / b;
        case "pow": return Math.pow(a, b);
        default: return b;
      }
    }

    static opSymbol(op) {
      return { "+": "+", "-": "−", "*": "×", "/": "÷", pow: "^" }[op] || op;
    }

    setOperator(nextOp) {
      if (this.error) return;
      const inputValue = parseFloat(this.current);

      if (this.operator && this.waitingForOperand) {
        // Replace the pending operator (e.g. user pressed + then ×)
        this.operator = nextOp;
        this.expression = `${this.previous} ${CalculatorEngine.opSymbol(nextOp)}`;
        return;
      }

      if (this.previous === null) {
        this.previous = inputValue;
      } else if (this.operator) {
        const result = CalculatorEngine.applyOp(this.previous, inputValue, this.operator);
        if (!Number.isFinite(result)) { this.setError(); return; }
        this.previous = result;
        this.current = String(result);
      }

      this.waitingForOperand = true;
      this.operator = nextOp;
      this.expression = `${formatNumber(this.previous, false)} ${CalculatorEngine.opSymbol(nextOp)}`;
    }

    equals() {
      if (this.error) return null;
      if (this.operator === null || this.previous === null) return null;

      const inputValue = parseFloat(this.current);
      const result = CalculatorEngine.applyOp(this.previous, inputValue, this.operator);

      const fullExpression = `${formatNumber(this.previous, false)} ${CalculatorEngine.opSymbol(this.operator)} ${formatNumber(inputValue, false)}`;

      if (!Number.isFinite(result)) { this.setError(); return { expression: fullExpression, result: "Error" }; }

      this.current = String(result);
      this.previous = null;
      this.operator = null;
      this.waitingForOperand = true;
      this.expression = `${fullExpression} =`;

      return { expression: fullExpression, result: formatNumber(result, false), raw: result };
    }

    /** Unary scientific functions, applied to the current value in place. */
    applyFunction(name) {
      if (this.error) this.reset();
      const x = parseFloat(this.current);
      let result;
      let label;

      switch (name) {
        case "sin": result = Math.sin(x * Math.PI / 180); label = `sin(${formatNumber(x, false)})`; break;
        case "cos": result = Math.cos(x * Math.PI / 180); label = `cos(${formatNumber(x, false)})`; break;
        case "tan": result = Math.tan(x * Math.PI / 180); label = `tan(${formatNumber(x, false)})`; break;
        case "log": result = Math.log10(x); label = `log(${formatNumber(x, false)})`; break;
        case "ln":  result = Math.log(x); label = `ln(${formatNumber(x, false)})`; break;
        case "sqrt": result = Math.sqrt(x); label = `√(${formatNumber(x, false)})`; break;
        case "square": result = x * x; label = `(${formatNumber(x, false)})²`; break;
        case "inv": result = x === 0 ? NaN : 1 / x; label = `1/(${formatNumber(x, false)})`; break;
        case "fact": result = factorial(x); label = `(${formatNumber(x, false)})!`; break;
        case "pi": result = Math.PI; label = "π"; break;
        case "e": result = Math.E; label = "e"; break;
        default: return null;
      }

      if (!Number.isFinite(result) || Number.isNaN(result)) { this.setError(); return { expression: label, result: "Error" }; }

      this.current = String(result);
      this.waitingForOperand = true;
      this.expression = `${label} =`;

      return { expression: label, result: formatNumber(result, false), raw: result };
    }

    setError() {
      this.error = true;
      this.current = "Error";
      this.previous = null;
      this.operator = null;
      this.waitingForOperand = true;
    }

    getDisplay(useSeparators) {
      if (this.error) return "Error";
      if (this.current === "" || this.current === "-") return "0";
      const num = parseFloat(this.current);
      if (Number.isNaN(num)) return this.current;
      // Preserve trailing "." while typing, e.g. "3."
      if (this.current.endsWith(".") && !useSeparators) return this.current;
      if (this.current.endsWith(".")) {
        return formatNumber(num, useSeparators) + ".";
      }
      return formatNumber(num, useSeparators);
    }
  }

  /* ===========================================================
     HistoryStore
     =========================================================== */
  class HistoryStore {
    constructor(limit = 50) {
      this.limit = limit;
      this.entries = loadFromStorage(STORAGE_KEYS.history, []);
    }

    add(expression, result, raw) {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        expression,
        result,
        raw,
        time: new Date().toISOString(),
      };
      this.entries.unshift(entry);
      if (this.entries.length > this.limit) this.entries.length = this.limit;
      saveToStorage(STORAGE_KEYS.history, this.entries);
      return entry;
    }

    clear() {
      this.entries = [];
      saveToStorage(STORAGE_KEYS.history, this.entries);
    }

    getAll() {
      return this.entries;
    }
  }

  /* ===========================================================
     ThemeManager
     =========================================================== */
  class ThemeManager {
    constructor(defaultTheme = "aurora") {
      this.theme = loadFromStorage(STORAGE_KEYS.theme, defaultTheme);
    }

    apply() {
      document.body.setAttribute("data-theme", this.theme);
      $$(".theme-swatch").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.theme === this.theme);
      });
    }

    set(theme) {
      this.theme = theme;
      saveToStorage(STORAGE_KEYS.theme, theme);
      this.apply();
    }
  }

  /* ===========================================================
     SettingsStore
     =========================================================== */
  class SettingsStore {
    constructor() {
      this.settings = loadFromStorage(STORAGE_KEYS.settings, {
        separators: true,
        reduceMotion: false,
        sound: false,
      });
    }

    get(key) { return this.settings[key]; }

    set(key, value) {
      this.settings[key] = value;
      saveToStorage(STORAGE_KEYS.settings, this.settings);
    }
  }

  /* ===========================================================
     SoundFeedback — tiny Web Audio beep, generated (no assets)
     =========================================================== */
  class SoundFeedback {
    constructor() {
      this.ctx = null;
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      return this.ctx;
    }

    play(freq = 640, duration = 0.045) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.02);
    }
  }

  /* ===========================================================
     UI — wires the engine + stores to the DOM
     =========================================================== */
  class UI {
    constructor() {
      this.engine = new CalculatorEngine();
      this.history = new HistoryStore();
      this.theme = new ThemeManager();
      this.settings = new SettingsStore();
      this.sound = new SoundFeedback();

      this.memoryValue = loadFromStorage(STORAGE_KEYS.memory, null);
      this.mode = loadFromStorage(STORAGE_KEYS.mode, "standard");

      this.cacheDom();
      this.bindEvents();
      this.applyInitialState();
      this.renderHistory();
      this.updateDisplay();
    }

    cacheDom() {
      this.el = {
        app: $("#app"),
        expression: $("#expression"),
        result: $("#result"),
        memoryBadge: $("#memoryBadge"),
        keys: $$(".key"),
        modeButtons: $$(".mode-switch__btn"),
        scientificKeys: $("#scientificKeys"),
        historyToggle: $("#historyToggle"),
        historyDrawer: $("#historyDrawer"),
        historyList: $("#historyList"),
        historyEmpty: $("#historyEmpty"),
        clearHistory: $("#clearHistory"),
        settingsToggle: $("#settingsToggle"),
        settingsPanel: $("#settingsPanel"),
        settingsClose: $("#settingsClose"),
        themeGrid: $("#themeGrid"),
        toggleSeparators: $("#toggleSeparators"),
        toggleMotion: $("#toggleMotion"),
        toggleSound: $("#toggleSound"),
        scrim: $("#scrim"),
      };
    }

    applyInitialState() {
      this.theme.apply();

      this.el.toggleSeparators.checked = !!this.settings.get("separators");
      this.el.toggleMotion.checked = !!this.settings.get("reduceMotion");
      this.el.toggleSound.checked = !!this.settings.get("sound");
      document.body.classList.toggle("motion-reduced", !!this.settings.get("reduceMotion"));

      this.setMode(this.mode, { silent: true });
      this.updateMemoryBadge();
    }

    bindEvents() {
      // Keypad (event delegation on the app root)
      this.el.app.addEventListener("click", (e) => {
        const keyEl = e.target.closest(".key");
        if (!keyEl) return;
        this.triggerRipple(keyEl, e);
        this.handleKeyAction(keyEl);
      });

      // Mode switch
      this.el.modeButtons.forEach((btn) => {
        btn.addEventListener("click", () => this.setMode(btn.dataset.mode));
      });

      // History drawer
      this.el.historyToggle.addEventListener("click", () => this.toggleDrawer());
      this.el.clearHistory.addEventListener("click", () => {
        this.history.clear();
        this.renderHistory();
      });
      this.el.historyList.addEventListener("click", (e) => {
        const item = e.target.closest(".history-item");
        if (!item) return;
        const entry = this.history.getAll().find((h) => h.id === item.dataset.id);
        if (entry && entry.raw !== undefined && entry.raw !== null) {
          this.engine.reset();
          this.engine.current = String(entry.raw);
          this.engine.waitingForOperand = true;
          this.updateDisplay();
          if (window.matchMedia("(max-width: 760px)").matches) this.toggleDrawer(false);
        }
      });

      // Settings panel
      this.el.settingsToggle.addEventListener("click", () => this.toggleSettings());
      this.el.settingsClose.addEventListener("click", () => this.toggleSettings(false));
      this.el.themeGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".theme-swatch");
        if (!btn) return;
        this.theme.set(btn.dataset.theme);
      });
      this.el.toggleSeparators.addEventListener("change", (e) => {
        this.settings.set("separators", e.target.checked);
        this.updateDisplay();
      });
      this.el.toggleMotion.addEventListener("change", (e) => {
        this.settings.set("reduceMotion", e.target.checked);
        document.body.classList.toggle("motion-reduced", e.target.checked);
      });
      this.el.toggleSound.addEventListener("change", (e) => {
        this.settings.set("sound", e.target.checked);
      });

      // Scrim closes any open overlay (mobile)
      this.el.scrim.addEventListener("click", () => {
        this.toggleDrawer(false);
        this.toggleSettings(false);
      });

      // Keyboard shortcuts
      window.addEventListener("keydown", (e) => this.handleKeydown(e));
    }

    /* ---------- Ripple ---------- */
    triggerRipple(keyEl, evt) {
      const rect = keyEl.getBoundingClientRect();
      const x = (evt.clientX ?? rect.left + rect.width / 2) - rect.left;
      const y = (evt.clientY ?? rect.top + rect.height / 2) - rect.top;
      keyEl.style.setProperty("--ripple-x", `${x}px`);
      keyEl.style.setProperty("--ripple-y", `${y}px`);
      keyEl.classList.remove("is-rippling");
      // Force reflow so the animation can restart on rapid repeat presses
      void keyEl.offsetWidth;
      keyEl.classList.add("is-rippling");

      if (this.settings.get("sound")) this.sound.play();
    }

    /* ---------- Mode ---------- */
    setMode(mode, opts = {}) {
      this.mode = mode;
      saveToStorage(STORAGE_KEYS.mode, mode);

      this.el.modeButtons.forEach((btn) => {
        const active = btn.dataset.mode === mode;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", String(active));
      });

      if (mode === "scientific") {
        this.el.scientificKeys.hidden = false;
      } else {
        this.el.scientificKeys.hidden = true;
      }
    }

    /* ---------- Drawer / Settings toggles ---------- */
    toggleDrawer(force) {
      const willOpen = force ?? !this.el.historyDrawer.classList.contains("is-open");
      this.el.historyDrawer.classList.toggle("is-open", willOpen);
      this.el.historyDrawer.setAttribute("aria-hidden", String(!willOpen));
      this.el.historyToggle.setAttribute("aria-expanded", String(willOpen));
      this.el.historyToggle.classList.toggle("is-active", willOpen);
      this.syncScrim();
    }

    toggleSettings(force) {
      const willOpen = force ?? !this.el.settingsPanel.classList.contains("is-open");
      this.el.settingsPanel.classList.toggle("is-open", willOpen);
      this.el.settingsPanel.setAttribute("aria-hidden", String(!willOpen));
      this.el.settingsToggle.setAttribute("aria-expanded", String(willOpen));
      this.el.settingsToggle.classList.toggle("is-active", willOpen);
      this.syncScrim();
    }

    syncScrim() {
      const anyOpen = this.el.historyDrawer.classList.contains("is-open") &&
        window.matchMedia("(max-width: 760px)").matches;
      const settingsOpen = this.el.settingsPanel.classList.contains("is-open");
      const visible = anyOpen || settingsOpen;
      this.el.scrim.hidden = !visible;
      requestAnimationFrame(() => this.el.scrim.classList.toggle("is-visible", visible));
    }

    /* ---------- Key handling ---------- */
    handleKeyAction(keyEl) {
      const action = keyEl.dataset.action;
      const value = keyEl.dataset.value;

      switch (action) {
        case "number": this.engine.inputDigit(value); break;
        case "decimal": this.engine.inputDecimal(); break;
        case "sign": this.engine.toggleSign(); break;
        case "backspace": this.engine.backspace(); break;
        case "clear-entry": this.engine.clearEntry(); break;
        case "clear": this.engine.reset(); break;
        case "operator": this.setOperatorActive(keyEl, value); this.engine.setOperator(value); break;
        case "equals": this.commitEquals(); break;
        case "fn": this.commitFunction(value); break;
        case "mem": this.handleMemory(value); break;
        default: return;
      }

      this.updateDisplay();
    }

    setOperatorActive(keyEl, op) {
      $$(".key--op").forEach((k) => k.classList.remove("is-active"));
      keyEl.classList.add("is-active");
    }

    commitEquals() {
      $$(".key--op").forEach((k) => k.classList.remove("is-active"));
      const outcome = this.engine.equals();
      if (outcome) {
        const raw = outcome.raw !== undefined ? outcome.raw : null;
        this.history.add(outcome.expression, outcome.result, raw);
        this.renderHistory();
      }
    }

    commitFunction(name) {
      const outcome = this.engine.applyFunction(name);
      if (outcome && name !== "pi" && name !== "e") {
        const raw = outcome.raw !== undefined ? outcome.raw : null;
        this.history.add(outcome.expression, outcome.result, raw);
        this.renderHistory();
      }
    }

    handleMemory(action) {
      const current = parseFloat(this.engine.current) || 0;
      switch (action) {
        case "mc": this.memoryValue = null; break;
        case "mr":
          if (this.memoryValue !== null) {
            this.engine.current = String(this.memoryValue);
            this.engine.waitingForOperand = true;
          }
          break;
        case "m-plus": this.memoryValue = (this.memoryValue || 0) + current; break;
        case "m-minus": this.memoryValue = (this.memoryValue || 0) - current; break;
        case "ms": this.memoryValue = current; break;
        default: return;
      }
      saveToStorage(STORAGE_KEYS.memory, this.memoryValue);
      this.updateMemoryBadge();
    }

    updateMemoryBadge() {
      const has = this.memoryValue !== null && this.memoryValue !== undefined;
      this.el.memoryBadge.hidden = !has;
    }

    /* ---------- Display / history rendering ---------- */
    updateDisplay() {
      const useSeparators = !!this.settings.get("separators");
      this.el.expression.textContent = this.engine.expression || "\u00A0";
      const text = this.engine.getDisplay(useSeparators);
      this.el.result.textContent = text;
      this.el.result.classList.toggle("is-error", text === "Error");
    }

    renderHistory() {
      const entries = this.history.getAll();
      this.el.historyList.innerHTML = "";

      entries.forEach((entry) => {
        const li = document.createElement("li");
        li.className = "history-item";
        li.dataset.id = entry.id;
        li.tabIndex = 0;

        const time = new Date(entry.time);
        const timeLabel = Number.isNaN(time.getTime())
          ? ""
          : time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        li.innerHTML = `
          <div class="history-item__expr">${escapeHtml(entry.expression)}</div>
          <div class="history-item__result">${escapeHtml(entry.result)}</div>
          <div class="history-item__time">${escapeHtml(timeLabel)}</div>
        `;
        this.el.historyList.appendChild(li);
      });

      this.el.historyEmpty.hidden = entries.length > 0;
    }

    /* ---------- Keyboard ---------- */
    handleKeydown(e) {
      // Ignore shortcuts while typing in a form control other than checkboxes
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" && e.target.type !== "checkbox") return;

      const key = e.key;

      if (/^[0-9]$/.test(key)) {
        this.engine.inputDigit(key);
        this.flashKeyFor(`[data-action="number"][data-value="${key}"]`);
        this.updateDisplay();
        return;
      }

      switch (key) {
        case ".":
          this.engine.inputDecimal();
          this.flashKeyFor('[data-action="decimal"]');
          this.updateDisplay();
          break;
        case "+": case "-": case "*": case "/": {
          const btn = $(`[data-action="operator"][data-value="${key}"]`);
          if (btn) this.setOperatorActive(btn, key);
          this.engine.setOperator(key);
          this.flashKeyFor(`[data-action="operator"][data-value="${key}"]`);
          this.updateDisplay();
          break;
        }
        case "Enter":
        case "=":
          e.preventDefault();
          this.commitEquals();
          this.flashKeyFor('[data-action="equals"]');
          this.updateDisplay();
          break;
        case "Backspace":
          this.engine.backspace();
          this.flashKeyFor('[data-action="backspace"]');
          this.updateDisplay();
          break;
        case "Escape":
          this.engine.reset();
          $$(".key--op").forEach((k) => k.classList.remove("is-active"));
          this.flashKeyFor('[data-action="clear"]');
          this.updateDisplay();
          break;
        case "%":
          this.commitFunction("square"); // quick access; kept simple & documented via UI
          this.updateDisplay();
          break;
        case "h": case "H":
          this.toggleDrawer();
          break;
        case "s": case "S":
          if (!e.metaKey && !e.ctrlKey) this.toggleSettings();
          break;
        default:
          return;
      }
    }

    flashKeyFor(selector) {
      const keyEl = $(selector);
      if (!keyEl) return;
      keyEl.classList.remove("is-rippling");
      void keyEl.offsetWidth;
      keyEl.style.setProperty("--ripple-x", "50%");
      keyEl.style.setProperty("--ripple-y", "50%");
      keyEl.classList.add("is-rippling");
      if (this.settings.get("sound")) this.sound.play();
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ===========================================================
     Boot
     =========================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    window.__refractUI = new UI();
  });
})();
