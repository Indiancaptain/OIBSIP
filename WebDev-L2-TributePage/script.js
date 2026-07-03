/* ==========================================================================
   Dr. A. P. J. Abdul Kalam — Tribute Page
   Vanilla JS: theme persistence, custom cursor, scroll reveal, 3D tilt,
   trajectory line draw, starfield, active nav, lightbox, counters.
   ========================================================================== */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  /* ---------------- Theme toggle ---------------- */
  const themeToggle = document.getElementById("theme-toggle");
  const THEME_KEY = "kalam-tribute-theme";

  function applyTheme(theme) {
    if (theme === "light") {
      root.setAttribute("data-theme", "light");
      themeToggle.setAttribute("aria-pressed", "true");
    } else {
      root.removeAttribute("data-theme");
      themeToggle.setAttribute("aria-pressed", "false");
    }
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    applyTheme(savedTheme);
  } else if (window.matchMedia("(prefers-color-scheme: light)").matches) {
    applyTheme("light");
  }

  themeToggle.addEventListener("click", () => {
    const isLight = root.getAttribute("data-theme") === "light";
    const next = isLight ? "dark" : "light";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  /* ---------------- Custom cursor ---------------- */
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");
  let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

  if (!("ontouchstart" in window)) {
    window.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%,-50%)`;
    });

    function ringLoop() {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%,-50%)`;
      requestAnimationFrame(ringLoop);
    }
    ringLoop();

    document.querySelectorAll("a, button, .chapter-card, .masonry-item, .honour-card, .waypoint").forEach((el) => {
      el.addEventListener("mouseenter", () => cursorRing.classList.add("is-active"));
      el.addEventListener("mouseleave", () => cursorRing.classList.remove("is-active"));
    });
  }

  /* ---------------- Scroll progress rail ---------------- */
  const scrollFill = document.getElementById("scroll-fill");
  function updateScrollProgress() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop;
    const height = doc.scrollHeight - doc.clientHeight;
    const pct = height > 0 ? (scrollTop / height) * 100 : 0;
    scrollFill.style.width = pct + "%";
  }

  /* ---------------- Trajectory line draw ---------------- */
  const trajProgress = document.getElementById("trajectory-progress");
  const trajectorySection = document.getElementById("timeline");
  let trajLength = 0;
  if (trajProgress) {
    trajLength = trajProgress.getTotalLength();
    trajProgress.style.strokeDasharray = trajLength;
    trajProgress.style.strokeDashoffset = trajLength;
  }

  function updateTrajectory() {
    if (!trajProgress || !trajectorySection) return;
    const rect = trajectorySection.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = rect.height + vh;
    const progressed = Math.min(Math.max(vh - rect.top, 0), total);
    const ratio = total > 0 ? progressed / total : 0;
    trajProgress.style.strokeDashoffset = trajLength - trajLength * ratio;
  }

  /* ---------------- Active nav link ---------------- */
  const navLinks = document.querySelectorAll("[data-nav]");
  const sections = Array.from(navLinks).map((a) => document.querySelector(a.getAttribute("href")));

  function updateActiveNav() {
    const scrollPos = window.scrollY + window.innerHeight * 0.4;
    let activeIndex = 0;
    sections.forEach((sec, i) => {
      if (sec && sec.offsetTop <= scrollPos) activeIndex = i;
    });
    navLinks.forEach((a, i) => a.classList.toggle("is-active", i === activeIndex));
  }

  /* ---------------- Master scroll handler ---------------- */
  let ticking = false;
  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateScrollProgress();
        updateTrajectory();
        updateActiveNav();
        ticking = false;
      });
      ticking = true;
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------------- 3D tilt on chapter cards ---------------- */
  if (!reduceMotion) {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (py - 0.5) * -8;
        const ry = (px - 0.5) * 8;
        card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        card.style.setProperty("--mx", `${px * 100}%`);
        card.style.setProperty("--my", `${py * 100}%`);
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(800px) rotateX(0) rotateY(0) translateY(0)";
      });
    });
  }

  /* ---------------- Starfield in hero ---------------- */
  const heroField = document.getElementById("hero-field");
  if (heroField && !reduceMotion) {
    const canvas = document.createElement("canvas");
    heroField.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    let stars = [];

    function resizeCanvas() {
      canvas.width = heroField.clientWidth;
      canvas.height = heroField.clientHeight;
      const count = Math.floor((canvas.width * canvas.height) / 9000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.3 + 0.2,
        a: Math.random(),
        speed: Math.random() * 0.35 + 0.05,
      }));
    }

    function drawStars() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const styles = getComputedStyle(root);
      const gold = styles.getPropertyValue("--accent-gold-soft").trim() || "#E4C862";
      stars.forEach((s) => {
        s.a += s.speed * 0.02;
        const twinkle = 0.35 + Math.abs(Math.sin(s.a)) * 0.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(234,239,247,${twinkle * 0.6})`;
        ctx.fill();
      });
      requestAnimationFrame(drawStars);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    drawStars();
  }

  /* ---------------- Honour counters ---------------- */
  const honourValues = document.querySelectorAll(".honour-value");
  if ("IntersectionObserver" in window) {
    const counterIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const raw = el.dataset.count;
          const numMatch = raw.match(/\d+/);
          if (numMatch && !reduceMotion) {
            const target = parseInt(numMatch[0], 10);
            const suffix = raw.replace(/^\d+/, "");
            let current = 0;
            const step = Math.max(1, Math.round(target / 40));
            const tick = () => {
              current = Math.min(current + step, target);
              el.textContent = current + suffix;
              if (current < target) requestAnimationFrame(tick);
            };
            tick();
          }
          counterIO.unobserve(el);
        });
      },
      { threshold: 0.6 }
    );
    honourValues.forEach((el) => counterIO.observe(el));
  }

  /* ---------------- Gallery lightbox ---------------- */
  const masonry = document.getElementById("masonry");
  if (masonry) {
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.innerHTML = `
      <div class="lightbox-panel">
        <button class="lightbox-close" aria-label="Close image">&times;</button>
        <div class="lightbox-media"></div>
        <div class="lightbox-caption"></div>
      </div>`;
    document.body.appendChild(lightbox);
    const panel = lightbox.querySelector(".lightbox-panel");
    const media = lightbox.querySelector(".lightbox-media");
    const caption = lightbox.querySelector(".lightbox-caption");
    const closeBtn = lightbox.querySelector(".lightbox-close");

    function openLightbox(item) {
      const svg = item.querySelector("svg");
      const fig = item.querySelector("figcaption");
      panel.style.setProperty("--panel-a", getComputedStyle(item).getPropertyValue("--panel-a"));
      panel.style.setProperty("--panel-b", getComputedStyle(item).getPropertyValue("--panel-b"));
      media.innerHTML = svg ? svg.outerHTML : "";
      caption.innerHTML = fig ? fig.innerHTML : "";
      lightbox.classList.add("is-open");
      closeBtn.focus();
    }
    function closeLightbox() {
      lightbox.classList.remove("is-open");
    }

    masonry.querySelectorAll(".masonry-item").forEach((item) => {
      item.setAttribute("tabindex", "0");
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", "View " + (item.dataset.caption || "image"));
      item.addEventListener("click", () => openLightbox(item));
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openLightbox(item);
        }
      });
    });
    closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  }

  /* ---------------- Hero portrait: fallback chain + tilt ---------------- */
  const portraitPhoto = document.getElementById("portrait-photo");
  const portraitFallback = document.getElementById("portrait-fallback");
  const portraitFrame = document.getElementById("portrait-frame");
  if (portraitPhoto) {
    portraitPhoto.addEventListener("error", () => {
      if (portraitFrame) portraitFrame.style.display = "none";
      if (portraitFallback) portraitFallback.hidden = false;
    });
  }
  if (portraitFrame && !reduceMotion) {
    portraitFrame.addEventListener("mousemove", (e) => {
      const rect = portraitFrame.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      portraitFrame.style.transform = `rotateY(${px * 10}deg) rotateX(${py * -10}deg)`;
    });
    portraitFrame.addEventListener("mouseleave", () => {
      portraitFrame.style.transform = "rotateY(0) rotateX(0)";
    });
  }

  /* ---------------- Hero mouse parallax ---------------- */
  const heroArcPath = document.getElementById("hero-arc-path");
  const heroEl = document.getElementById("hero");
  if (heroEl && heroArcPath && !reduceMotion) {
    heroEl.addEventListener("mousemove", (e) => {
      const rect = heroEl.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      heroArcPath.style.transform = `translate(${px * 14}px, ${py * 10}px)`;
    });
  }
})();
