/* ===========================================================================
   ui.js — Screen framework, HUD, mascot, and all non-gameplay screens
   (home, player pick, level select, sticker book, shop, trophies, settings).
   Gameplay itself lives in game.js.
   =========================================================================== */
(function () {
  "use strict";
  window.SB = window.SB || {};
  const A = () => SB.audio;
  const S = () => SB.state;

  const UI = {
    app: null,
    canHover: false,
    lastHover: null,
    screen: null
  };

  /* ---------------- bootstrap ----------------------------------------- */
  UI.init = function () {
    UI.app = document.getElementById("app");
    UI.canHover = window.matchMedia && window.matchMedia("(hover: hover)").matches;

    // Audio-driven: read button labels aloud on hover (desktop only) and
    // on keyboard focus, so a child never needs to read.
    if (UI.canHover) {
      document.addEventListener("pointerover", (e) => {
        const el = e.target.closest && e.target.closest("[data-speak]");
        if (el && el !== UI.lastHover) {
          UI.lastHover = el;
          A().speak(el.getAttribute("data-speak"), { rate: 1.05, pitch: 1.1 });
        }
      });
      document.addEventListener("pointerout", (e) => {
        const el = e.target.closest && e.target.closest("[data-speak]");
        if (el === UI.lastHover) UI.lastHover = null;
      });
    }
    document.addEventListener("focusin", (e) => {
      const el = e.target.closest && e.target.closest("[data-speak]");
      if (el) A().speak(el.getAttribute("data-speak"), { rate: 1.05, pitch: 1.1 });
    });

    // First gesture unlocks audio.
    const unlock = () => { A().unlock(); };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  };

  /* ---------------- helpers ------------------------------------------- */
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  UI.el = el;

  // Friendly button factory. label shown; speak = what the voice reads.
  function btn(opts) {
    const b = el("button", "btn " + (opts.cls || ""));
    b.innerHTML = (opts.icon ? `<span class="btn-ico">${opts.icon}</span>` : "") +
                  `<span class="btn-label">${opts.label || ""}</span>`;
    if (opts.speak) b.setAttribute("data-speak", opts.speak);
    if (opts.aria) b.setAttribute("aria-label", opts.aria);
    b.addEventListener("click", (e) => {
      A().sfx("click");
      if (opts.onClick) opts.onClick(e, b);
    });
    return b;
  }
  UI.btn = btn;

  UI.clear = function () {
    if (SB.game && SB.game._teardownWord) SB.game._teardownWord(); // kill any live keyboard listener
    UI.app.innerHTML = "";
    if (SB.fx && SB.fx.clear) SB.fx.clear();
  };

  // The mascot bee with a speech bubble. Speaks + shows (and animates).
  UI.mascot = function (text, opts) {
    opts = opts || {};
    const p = S().player();
    const wrap = el("div", "mascot");
    const hat = p.hat ? `<span class="mascot-hat">${p.hat}</span>` : "";
    wrap.innerHTML =
      `<div class="bubble">${text}</div>` +
      `<div class="bee ${opts.bounce ? "bounce" : ""}">${hat}<span class="bee-emoji">🐝</span></div>`;
    if (text && opts.speak !== false) {
      A().sfx("buzz");
      setTimeout(() => A().speak(text, { interrupt: opts.interrupt !== false }), 120);
    }
    return wrap;
  };

  // Re-speak helper for "what can I do?" buttons.
  UI.sayAgain = function (text) { A().speak(text); };

  /* ---------------- HUD (top bar) ------------------------------------- */
  UI.hud = function (opts) {
    opts = opts || {};
    const p = S().player();
    const need = S().xpForLevel(p.level);
    const pct = Math.max(0, Math.min(100, (p.xp / need) * 100));
    const beltName = S().beltName(p.belt);
    const bar = el("div", "hud");

    const left = el("div", "hud-left");
    if (opts.back) {
      const back = btn({ icon: "🏠", cls: "btn-round", aria: "Home", speak: "Go home" });
      back.addEventListener("click", () => SB.ui.show(opts.back));
      left.appendChild(back);
    }
    left.appendChild(el("div", "hud-player",
      `<span class="hud-name">${p.name}</span>` +
      `<span class="hud-belt" title="${beltName} Belt">${beltEmoji(p.belt)} ${beltName}</span>`));

    const mid = el("div", "hud-mid");
    mid.innerHTML =
      `<div class="lvl-pill"><span class="lvl-num">Lv ${p.level}</span>` +
      `<span class="xpbar"><span class="xpfill" style="width:${pct}%"></span></span></div>`;

    const right = el("div", "hud-right");
    right.innerHTML =
      `<div class="hud-stat coins" id="hudCoins"><span class="ico">🪙</span><span class="val">${p.coins}</span></div>` +
      (p.streak > 0 ? `<div class="hud-stat streak"><span class="ico">🔥</span><span class="val">${p.streak}</span></div>` : "");
    const mute = btn({ icon: A().muted ? "🔇" : "🔊", cls: "btn-round",
      aria: "Sound on or off", speak: A().muted ? "Turn sound on" : "Turn sound off" });
    mute.addEventListener("click", () => {
      A().muted = !A().muted;
      S().get().settings.muted = A().muted; S().save();
      mute.querySelector(".btn-ico").textContent = A().muted ? "🔇" : "🔊";
      if (!A().muted) A().sfx("pop");
    });
    right.appendChild(mute);

    bar.appendChild(left); bar.appendChild(mid); bar.appendChild(right);
    return bar;
  };

  function beltEmoji(id) {
    const m = { white: "⬜", yellow: "🟨", orange: "🟧", green: "🟩", blue: "🟦",
      purple: "🟪", brown: "🟫", red: "🟥", black: "⬛" };
    return m[id] || "🥋";
  }
  UI.beltEmoji = beltEmoji;

  // Update just the coin counter live (used during play).
  UI.bumpCoins = function () {
    const c = document.getElementById("hudCoins");
    if (!c) return;
    c.querySelector(".val").textContent = S().player().coins;
    SB.fx.pulse(c);
  };

  /* ===================================================================
     SCREENS
     =================================================================== */

  UI.screens = {};

  UI.show = function (name, arg) {
    UI.screen = name;
    A().cancelVoice();
    if (SB.fx && SB.fx.clear) SB.fx.clear();
    const fn = UI.screens[name];
    if (fn) fn(arg);
  };

  /* ---- Home / title --------------------------------------------------- */
  UI.screens.home = function () {
    UI.clear();
    const wrap = el("div", "screen home");
    wrap.appendChild(el("div", "title-wrap",
      `<div class="game-title">🐝 Spelling Bee 🐝</div>
       <div class="game-sub">Buzz, Spell, and Win!</div>`));

    wrap.appendChild(UI.mascot("Hi! I'm Buzzy the Bee. Who is playing today? Tap your name!"));

    const cards = el("div", "player-cards");
    [["alice", "👧", "Alice", "Spelling drills", "#ff8ac4"],
     ["eddie", "👦", "Eddie", "Sound it out", "#5ad1ff"]].forEach(([id, face, nm, sub, col]) => {
      const p = S().player(id);
      const card = el("button", "player-card");
      card.style.setProperty("--pc", col);
      card.setAttribute("data-speak", `${nm}. ${sub}. Level ${p.level}.`);
      card.innerHTML =
        `<div class="pc-face">${face}</div>
         <div class="pc-name">${nm}</div>
         <div class="pc-sub">${sub}</div>
         <div class="pc-meta">${beltEmoji(p.belt)} Lv ${p.level} · 🪙 ${p.coins}</div>`;
      card.addEventListener("click", () => {
        A().sfx("pop");
        S().setCurrent(id);
        UI.show("menu");
      });
      cards.appendChild(card);
    });
    wrap.appendChild(cards);

    const versus = btn({ icon: "🏁", label: "Alice vs Eddie Race!", cls: "btn-big btn-versus",
      speak: "Alice versus Eddie. A spelling race!",
      onClick: () => { A().sfx("whoosh"); SB.game.startVersus(); } });
    wrap.appendChild(versus);

    UI.app.appendChild(wrap);
  };

  /* ---- Player menu (hub) --------------------------------------------- */
  UI.screens.menu = function () {
    UI.clear();
    const p = S().player();
    UI.app.appendChild(UI.hud({ back: "home" }));
    const wrap = el("div", "screen menu");

    const isAlice = S().currentId() === "alice";
    const intro = isAlice
      ? `Hi ${p.name}! Ready to spell? Tap Play to start, or check your stickers and shop!`
      : `Hi ${p.name}! Let's sound out some words! Tap Play with the big green button!`;
    wrap.appendChild(UI.mascot(intro));

    const grid = el("div", "menu-grid");
    const items = [
      { icon: "▶️", label: "Play", cls: "tile-play", speak: "Play spelling!",
        go: () => isAlice ? UI.show("levels") : SB.game.startEddie() }
    ];
    if (isAlice) items.push(
      { icon: "🎯", label: "Review", cls: "tile-review", speak: "Review my tricky words",
        go: () => SB.game.startReview() });
    items.push(
      { icon: "🎨", label: "Stickers", cls: "tile-stickers", speak: "My sticker book",
        go: () => UI.show("stickers") },
      { icon: "🛒", label: "Shop", cls: "tile-shop", speak: "The coin shop",
        go: () => UI.show("shop") },
      { icon: "🏆", label: "Trophies", cls: "tile-trophies", speak: "My trophies",
        go: () => UI.show("trophies") },
      { icon: "⚙️", label: "Settings", cls: "tile-settings", speak: "Settings",
        go: () => UI.show("settings") }
    );
    items.forEach((it) => {
      const t = el("button", "menu-tile " + it.cls);
      t.setAttribute("data-speak", it.speak);
      t.innerHTML = `<span class="mt-ico">${it.icon}</span><span class="mt-label">${it.label}</span>`;
      t.addEventListener("click", () => { A().sfx("pop"); it.go(); });
      grid.appendChild(t);
    });
    wrap.appendChild(grid);
    UI.app.appendChild(wrap);
  };

  /* ---- Level (belt) select — Alice only ------------------------------ */
  UI.screens.levels = function () {
    UI.clear();
    const p = S().player();
    UI.app.appendChild(UI.hud({ back: "menu" }));
    const wrap = el("div", "screen levels");
    wrap.appendChild(UI.mascot("Pick a belt to practice! Start with white. New belts unlock as you level up!"));

    const list = el("div", "belt-list");
    SB.WORDS.alice.belts.forEach((belt, i) => {
      // All topics are open — Alice should be able to practise any Grade-2
      // pattern right away. Belts are categories to pick, not gated levels.
      const unlocked = true;
      const done = p.beltProgress[belt.id] ? Object.keys(p.beltProgress[belt.id]).length : 0;
      const total = belt.words.length;
      const card = el("button", "belt-card" + (unlocked ? "" : " locked"));
      card.style.setProperty("--bc", belt.color);
      card.setAttribute("data-speak", unlocked
        ? `${belt.name}. ${belt.blurb} ${done} of ${total} words done.`
        : `${belt.name} is locked. Level up to open it!`);
      card.innerHTML =
        `<span class="belt-ico">${belt.emoji}</span>
         <span class="belt-info"><span class="belt-name">${belt.name}</span>
           <span class="belt-blurb">${belt.blurb}</span>
           <span class="belt-prog"><span class="belt-progfill" style="width:${(done / total) * 100}%"></span></span>
           <span class="belt-count">${done}/${total} ${done >= total ? "⭐" : ""}</span></span>
         ${unlocked ? "" : '<span class="belt-lock">🔒</span>'}`;
      card.addEventListener("click", () => {
        if (!unlocked) {
          A().sfx("wrong");
          A().speak("That belt is locked. Practice more to open it!");
          SB.fx.shake(card);
          return;
        }
        A().sfx("whoosh");
        SB.game.startAlice(belt.id);
      });
      list.appendChild(card);
    });
    wrap.appendChild(list);
    UI.app.appendChild(wrap);
  };

  /* ---- Sticker book --------------------------------------------------- */
  UI.screens.stickers = function () {
    UI.clear();
    const p = S().player();
    UI.app.appendChild(UI.hud({ back: "menu" }));
    const wrap = el("div", "screen stickers");
    const have = Object.keys(p.stickers).length;
    const total = S().STICKERS.length;
    wrap.appendChild(UI.mascot(`Your sticker book! You have ${have} of ${total} stickers. Spell more to collect them all!`));

    const grid = el("div", "sticker-grid");
    S().STICKERS.forEach((s) => {
      const count = p.stickers[s.id] || 0;
      const got = count > 0;
      const cell = el("button", "sticker-cell" + (got ? " got" : " missing"));
      cell.setAttribute("data-speak", got ? `${s.name}. You have ${count}.` : "A mystery sticker. Not found yet!");
      cell.innerHTML = got
        ? `<span class="sticker-emoji">${s.e}</span>${count > 1 ? `<span class="sticker-x">×${count}</span>` : ""}<span class="sticker-name">${s.name}</span>`
        : `<span class="sticker-emoji q">❓</span><span class="sticker-name">???</span>`;
      if (got) cell.addEventListener("click", () => {
        A().sfx("sticker"); A().speak(s.name);
        SB.fx.burst(cell.getBoundingClientRect().left + 30, cell.getBoundingClientRect().top + 30, p.theme, 18);
        SB.fx.pulse(cell);
      });
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    UI.app.appendChild(wrap);
  };

  /* ---- Shop ----------------------------------------------------------- */
  UI.screens.shop = function () {
    UI.clear();
    const p = S().player();
    UI.app.appendChild(UI.hud({ back: "menu" }));
    const wrap = el("div", "screen shop");
    wrap.appendChild(UI.mascot(`Welcome to the shop! You have ${p.coins} coins. Tap something to buy it!`));

    const grid = el("div", "shop-grid");
    S().SHOP.forEach((item) => {
      const owned = !!p.shop[item.id] && item.type !== "hints";
      const afford = p.coins >= item.cost;
      const cell = el("button", "shop-cell" + (owned ? " owned" : afford ? "" : " cant"));
      const equipped = (item.type === "hat" && p.hat === item.hat) ||
                       (item.type === "theme" && p.theme === item.theme);
      cell.setAttribute("data-speak", owned
        ? `${item.name}. You own this.${item.type !== "hints" ? " Tap to use it." : ""}`
        : `${item.name}. Costs ${item.cost} coins.`);
      cell.innerHTML =
        `<span class="shop-ico">${item.emoji}</span>
         <span class="shop-name">${item.name}</span>
         <span class="shop-cost">${owned ? (equipped ? "✅ On" : (item.type === "hat" || item.type === "theme" ? "Tap to use" : "Owned")) : `🪙 ${item.cost}`}</span>`;
      cell.addEventListener("click", () => {
        if (owned) {
          if (item.type === "hat") { A().sfx("pop"); S().equipHat(S().currentId(), item.hat); UI.show("shop"); A().speak(equipped ? "Hat off" : "Buzzy looks great!"); }
          else if (item.type === "theme") { A().sfx("sticker"); S().setTheme(S().currentId(), item.theme); SB.fx.celebrate(item.theme); UI.show("shop"); }
          else { A().sfx("click"); }
          return;
        }
        const res = S().buy(S().currentId(), item.id);
        if (res.ok) {
          A().sfx("coin"); A().sfx("levelup");
          SB.fx.celebrate(p.theme);
          A().speak(`You got ${item.say}!`);
          UI.show("shop");
        } else if (res.reason === "broke") {
          A().sfx("wrong"); SB.fx.shake(cell);
          A().speak("You need more coins. Keep spelling to earn them!");
        }
      });
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);
    UI.app.appendChild(wrap);
  };

  /* ---- Trophies ------------------------------------------------------- */
  UI.screens.trophies = function () {
    UI.clear();
    const p = S().player();
    UI.app.appendChild(UI.hud({ back: "menu" }));
    const wrap = el("div", "screen trophies");
    const got = Object.keys(p.trophies).length;
    wrap.appendChild(UI.mascot(`You have won ${got} trophies! Keep going to win them all!`));
    const grid = el("div", "trophy-grid");
    S().TROPHIES.forEach((t) => {
      const has = !!p.trophies[t.id];
      const cell = el("button", "trophy-cell" + (has ? " got" : " missing"));
      cell.setAttribute("data-speak", has ? `${t.name}. Won!` : `${t.name}. Not yet.`);
      cell.innerHTML = `<span class="trophy-emoji">${has ? t.emoji : "🔒"}</span><span class="trophy-name">${t.name}</span>`;
      if (has) cell.addEventListener("click", () => { A().sfx("fanfare"); A().speak(t.name); SB.fx.pulse(cell); });
      grid.appendChild(cell);
    });
    wrap.appendChild(grid);

    // stats strip
    const stats = el("div", "stat-strip");
    stats.innerHTML =
      `<div class="ss"><b>${p.totalCorrect}</b><span>words spelled</span></div>
       <div class="ss"><b>${p.bestStreak}</b><span>best streak 🔥</span></div>
       <div class="ss"><b>${p.coinsEverEarned}</b><span>coins earned 🪙</span></div>
       <div class="ss"><b>${p.perfectRounds}</b><span>perfect rounds ✨</span></div>`;
    wrap.appendChild(stats);
    UI.app.appendChild(wrap);
  };

  /* ---- Settings ------------------------------------------------------- */
  UI.screens.settings = function () {
    UI.clear();
    const st = S().get().settings;
    UI.app.appendChild(UI.hud({ back: "menu" }));
    const wrap = el("div", "screen settings");
    wrap.appendChild(UI.mascot("Settings! A grown-up can change my voice and how fast I talk here."));

    // Honest warning: if storage is blocked (common in Safari opened from a
    // file:// path), progress won't survive a relaunch.
    if (S()._mem) {
      const warn = el("div", "storage-warn",
        "⚠️ Heads up for grown-ups: this browser isn't saving progress between " +
        "sessions. For coins & stickers to stick, run it from the little web " +
        "server (the http:// link) or use Chrome.");
      wrap.appendChild(warn);
    }

    const card = el("div", "settings-card");

    // Voice speed
    card.appendChild(sliderRow("Talking speed 🗣️", 0.6, 1.2, 0.05, st.rate, (v) => {
      st.rate = v; A().rate = v; S().save();
    }, () => A().speak("Like this!", { rate: st.rate })));

    // Voice volume
    card.appendChild(sliderRow("Voice volume 🔊", 0, 1, 0.1, st.voiceVolume, (v) => {
      st.voiceVolume = v; A().voiceVolume = v; S().save();
    }, () => A().speak("Hello!", { volume: st.voiceVolume })));

    // SFX volume
    card.appendChild(sliderRow("Sound effects 🎵", 0, 1, 0.1, st.sfxVolume, (v) => {
      st.sfxVolume = v; A().sfxVolume = v; S().save();
    }, () => A().sfx("coin")));

    // Letter echo toggle
    const echoRow = el("div", "set-row");
    echoRow.innerHTML = `<label>Say each letter while typing 🔤</label>`;
    const echoBtn = btn({ label: st.letterEcho ? "On" : "Off", cls: "toggle " + (st.letterEcho ? "on" : "off"),
      onClick: (e, b) => {
        st.letterEcho = !st.letterEcho; S().save();
        b.querySelector(".btn-label").textContent = st.letterEcho ? "On" : "Off";
        b.classList.toggle("on", st.letterEcho); b.classList.toggle("off", !st.letterEcho);
        A().speak(st.letterEcho ? "I will say each letter" : "Letters off");
      } });
    echoRow.appendChild(echoBtn);
    card.appendChild(echoRow);

    // Voice picker — curated, not the raw OS voice list. On macOS/iOS
    // `A().voices` can be a huge unsorted pile including novelty voices that
    // are a bad surprise for a grown-up to land a kid on. Prefer
    // `A().rankedVoices()` (filtered + best-first) when the audio module
    // provides one; always fall back to the raw list since we can't assume
    // it exists.
    const allVoices = (A().rankedVoices ? A().rankedVoices() : A().voices) || [];
    if (allVoices.length) {
      const vrow = el("div", "set-row");
      vrow.innerHTML = `<label>Voice 🎙️</label>`;
      const sel = el("select", "voice-select");

      const TOP_N = 12;
      const shortlist = allVoices.slice(0, TOP_N);
      // Never let a saved preference disappear from the list just because
      // it didn't make the top N.
      const current = A().voice;
      if (current && !shortlist.some((v) => v.name === current.name)) {
        const found = allVoices.find((v) => v.name === current.name);
        if (found) shortlist.push(found);
      }

      shortlist.forEach((v, i) => {
        const o = el("option"); o.value = v.name;
        o.textContent = (i === 0 ? "⭐ " : "") + `${v.name} (${v.lang})`;
        if (A().voice && A().voice.name === v.name) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", () => {
        const v = allVoices.find((x) => x.name === sel.value);
        if (v) { A().voice = v; st.voiceName = v.name; S().save(); A().speak("Hi! I sound like this now."); }
      });
      vrow.appendChild(sel);

      // Let a grown-up audition the current voice without changing anything.
      const tryBtn = btn({ label: "Try voice", cls: "ctl",
        speak: "Try this voice",
        onClick: () => A().speak("Hi! Let's spell some words together!") });
      vrow.appendChild(tryBtn);

      card.appendChild(vrow);
    }

    wrap.appendChild(card);

    // Reset (grown-up zone) — requires a little confirm
    const danger = el("div", "danger-zone");
    const resetBtn = btn({ label: "Reset " + S().player().name + "'s progress", cls: "btn-danger",
      speak: "Reset progress. Careful!",
      onClick: () => {
        if (resetBtn.dataset.armed) {
          S().resetPlayer(S().currentId());
          A().sfx("whoosh"); A().speak("All reset!");
          UI.show("menu");
        } else {
          resetBtn.dataset.armed = "1";
          resetBtn.querySelector(".btn-label").textContent = "Tap again to really reset!";
          setTimeout(() => { resetBtn.dataset.armed = ""; if (resetBtn.querySelector(".btn-label")) resetBtn.querySelector(".btn-label").textContent = "Reset " + S().player().name + "'s progress"; }, 3000);
        }
      } });
    danger.appendChild(resetBtn);
    wrap.appendChild(danger);

    UI.app.appendChild(wrap);
  };

  function sliderRow(label, min, max, step, val, onInput, onTry) {
    const row = el("div", "set-row");
    row.innerHTML = `<label>${label}</label>`;
    const input = el("input", "slider");
    input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = val;
    input.addEventListener("input", () => onInput(parseFloat(input.value)));
    input.addEventListener("change", () => { if (onTry) onTry(); });
    row.appendChild(input);
    return row;
  }

  SB.ui = UI;
})();
