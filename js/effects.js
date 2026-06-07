/* ===========================================================================
   effects.js — Confetti, sparkles, and floating reward popups.
   Pure canvas + DOM, no assets.
   =========================================================================== */
(function () {
  "use strict";
  window.SB = window.SB || {};

  let canvas, ctx, particles = [], raf = null;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement("canvas");
    canvas.id = "fxCanvas";
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9000;";
    document.body.appendChild(canvas);
    ctx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
  }

  function resize() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const THEMES = {
    confetti: ["#ff5a5a", "#ffd93b", "#5ad17a", "#4aa3ff", "#a96bff", "#ff9f3a"],
    rainbow: ["#ff0000", "#ff8c00", "#ffd700", "#00c853", "#2196f3", "#7c4dff", "#e040fb"],
    stars: ["#ffd93b", "#fff4b8", "#ffe44d", "#fff", "#ffe9a8"]
  };

  function spawn(x, y, count, opts) {
    opts = opts || {};
    const colors = THEMES[opts.theme] || THEMES.confetti;
    const star = opts.theme === "stars";
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = (opts.spread || 6) * (0.4 + Math.random());
      particles.push({
        x, y,
        vx: Math.cos(a) * speed * (0.6 + Math.random()),
        vy: Math.sin(a) * speed - (opts.up || 4) - Math.random() * 4,
        g: 0.18 + Math.random() * 0.12,
        size: 6 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: colors[(Math.random() * colors.length) | 0],
        life: 1,
        decay: 0.008 + Math.random() * 0.01,
        star
      });
    }
    run();
  }

  function run() {
    if (raf) return;
    const step = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        p.vx *= 0.99; p.life -= p.decay;
        if (p.life <= 0 || p.y > window.innerHeight + 40) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.star) drawStar(ctx, p.size);
        else ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      }
      if (particles.length) raf = requestAnimationFrame(step);
      else { cancelAnimationFrame(raf); raf = null; ctx.clearRect(0, 0, canvas.width, canvas.height); }
    };
    raf = requestAnimationFrame(step);
  }

  function drawStar(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      const a2 = a + Math.PI / 5;
      ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
  }

  const Effects = {
    // Big celebration from bottom corners + center burst.
    celebrate(theme) {
      ensureCanvas();
      const w = window.innerWidth, h = window.innerHeight;
      spawn(w * 0.5, h * 0.45, 70, { theme, spread: 8, up: 6 });
      spawn(0, h, 40, { theme, spread: 11, up: 9 });
      spawn(w, h, 40, { theme, spread: 11, up: 9 });
    },
    burst(x, y, theme, count) {
      ensureCanvas();
      spawn(x, y, count || 28, { theme, spread: 6, up: 3 });
    },
    rain(theme) {
      ensureCanvas();
      const w = window.innerWidth;
      for (let i = 0; i < 60; i++) {
        setTimeout(() => spawn(Math.random() * w, -20, 1, { theme, spread: 1, up: -2 }), i * 30);
      }
    },
    // Floating "+10 🪙" style popup near an element or point.
    popup(text, x, y, cls) {
      const el = document.createElement("div");
      el.className = "fx-popup " + (cls || "");
      el.textContent = text;
      el.style.left = x + "px";
      el.style.top = y + "px";
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add("go"));
      setTimeout(() => el.remove(), 1400);
    },
    // Clear everything (used on screen changes so a paused/throttled
    // animation frame never leaves stale confetti painted on screen).
    clear() {
      particles.length = 0;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
    shake(el) {
      if (!el) return;
      el.classList.remove("shake");
      void el.offsetWidth;
      el.classList.add("shake");
    },
    pulse(el) {
      if (!el) return;
      el.classList.remove("pulse");
      void el.offsetWidth;
      el.classList.add("pulse");
    }
  };

  SB.fx = Effects;
})();
