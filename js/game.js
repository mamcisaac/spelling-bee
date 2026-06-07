/* ===========================================================================
   game.js — Gameplay: Alice's typing drill, Eddie's letter tiles, and the
   head-to-head race. Handles rewards + celebrations.
   =========================================================================== */
(function () {
  "use strict";
  window.SB = window.SB || {};
  const A = () => SB.audio;
  const S = () => SB.state;
  const UI = () => SB.ui;
  const FX = () => SB.fx;
  const el = (t, c, h) => SB.ui.el(t, c, h);

  const PRAISE = ["Yes!", "Awesome!", "You got it!", "Super spelling!", "Way to go!",
    "Brilliant!", "Spelling star!", "Buzz buzz, perfect!", "Amazing!", "You're on fire!"];
  const ENCOURAGE = ["Good try!", "Almost!", "So close!", "Nearly there!", "You can do it!"];
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // Adaptive selection: pick `n` words, biased toward new + previously-missed
  // words and away from already-mastered ones. This is the "drill the weak
  // spots" engine — missed words come back around more often.
  function pickWeighted(words, player, n) {
    const weight = (spec) => {
      const w = spec.w;
      const mastered = (player.mastered && player.mastered[w]) || 0;
      const struggle = (player.struggle && player.struggle[w]) || 0;
      let score = 1;
      if (mastered === 0) score += 2.5;          // favour words not yet learned
      score += struggle * 3;                      // strongly resurface misses
      score -= Math.min(mastered, 5) * 0.35;      // ease off once well-known
      return Math.max(0.3, score);
    };
    const pool = words.map((s) => ({ s, w: weight(s) }));
    const chosen = [];
    n = Math.min(n, pool.length);
    while (chosen.length < n && pool.length) {
      let total = pool.reduce((t, x) => t + x.w, 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) { r -= pool[idx].w; if (r <= 0) break; }
      idx = Math.min(idx, pool.length - 1);
      chosen.push(pool[idx].s);
      pool.splice(idx, 1);
    }
    return shuffle(chosen);
  }

  const Game = {};

  // Tracks the in-progress word so we can tear down its keyboard listener if
  // the player navigates away mid-word (otherwise it leaks and can fire
  // phantom submissions on later screens). Called from UI.clear().
  let activeWordCleanup = null;
  Game._teardownWord = function () { if (activeWordCleanup) activeWordCleanup(); };

  /* ===================================================================
     ROUND SETUP (solo)
     =================================================================== */
  Game.startAlice = function (beltId) {
    const belt = SB.WORDS.alice.belts.find((b) => b.id === beltId);
    const words = pickWeighted(belt.words, S().player("alice"), 10);
    runRound({
      playerId: "alice", mode: "type", beltId,
      title: belt.name, words,
      intro: `Let's spell ${belt.name} words! Listen, then type. I'll help you!`
    });
  };

  Game.startEddie = function () {
    // Bias toward known words first, then CVC. Keep rounds short (6) for a 4yo.
    const p = S().player("eddie");
    const known = SB.WORDS.eddie.words.filter((w) => w.known);
    const cvc = SB.WORDS.eddie.words.filter((w) => !w.known);
    const words = pickWeighted(known, p, 2).concat(pickWeighted(cvc, p, 4));
    runRound({
      playerId: "eddie", mode: "tiles",
      title: "Sound it Out", words: shuffle(words),
      intro: "Let's make some words! Listen to the word, then tap the letters!"
    });
  };

  // "Review my tricky words" — pulls Alice's most-missed / not-yet-mastered
  // words from ACROSS every belt, so her weak spots come back even if she never
  // thinks to replay the belt they came from.
  Game.startReview = function () {
    const p = S().player("alice");
    const pool = [];
    SB.WORDS.alice.belts.forEach((b) => {
      b.words.forEach((w) => pool.push(Object.assign({ _belt: b.id }, w)));
    });
    const struggled = pool.filter((s) => (p.struggle[s.w] || 0) > 0);
    let words, intro;
    if (struggled.length >= 4) {
      words = pickWeighted(struggled, p, Math.min(10, struggled.length));
      intro = "Let's beat your tricky words! These are the ones to practise.";
    } else {
      words = pickWeighted(pool, p, 10);
      intro = "Let's mix it up and review all kinds of words!";
    }
    runRound({ playerId: "alice", mode: "type", beltId: null, review: true,
      title: "Review", words, intro });
  };

  function runRound(cfg) {
    S().setCurrent(cfg.playerId);
    let idx = 0;
    let allFirstTry = true;
    let coinsThisRound = 0;
    const total = cfg.words.length;

    UI().clear();
    UI().app.appendChild(UI().hud({ back: "menu" }));
    const stage = el("div", "screen play");

    // progress dots
    const dots = el("div", "progress-dots");
    for (let i = 0; i < total; i++) dots.appendChild(el("span", "dot"));
    stage.appendChild(dots);

    const mascotSlot = el("div", "mascot-slot");
    stage.appendChild(mascotSlot);

    const wordSlot = el("div", "word-slot");
    stage.appendChild(wordSlot);

    UI().app.appendChild(stage);

    mascotSlot.appendChild(UI().mascot(cfg.intro));

    function setDots() {
      [...dots.children].forEach((d, i) => {
        d.classList.toggle("done", i < idx);
        d.classList.toggle("current", i === idx);
      });
    }

    function nextWord() {
      setDots();
      if (idx >= total) return finish();
      wordSlot.innerHTML = "";
      mascotSlot.innerHTML = "";
      const spec = cfg.words[idx];
      playWord(wordSlot, spec, cfg.mode, {
        playerId: cfg.playerId, hintIcon: true, intro: true, mascotSlot
      }, (res) => {
        const ev = S().recordResult(cfg.playerId, {
          correct: true, firstTry: res.firstTry, word: spec.w,
          belt: spec._belt || cfg.beltId
        });
        if (!res.firstTry) allFirstTry = false;
        coinsThisRound += ev.coins;
        idx++;
        celebrate(ev, res, () => nextWord());
      });
    }

    function finish() {
      let perfectBonus = null;
      if (allFirstTry && total >= 4) perfectBonus = S().recordPerfectRound(cfg.playerId);
      roundSummary(cfg, { coins: coinsThisRound, perfect: allFirstTry, perfectBonus, total });
    }

    nextWord();
  }

  /* ===================================================================
     SINGLE WORD WIDGET
     mode = "type" (Alice keyboard) or "tiles" (Eddie tap)
     onResult({ firstTry, attempts }) called when the word is spelled right.
     =================================================================== */
  function playWord(container, spec, mode, opts, onResult) {
    const word = spec.w.toLowerCase();
    const letters = word.split("");
    let attempts = 0;
    let revealed = false;

    const p = S().player(opts.playerId);

    const stageEl = el("div", "play-stage");
    container.appendChild(stageEl);

    // --- controls (audio) ---
    const controls = el("div", "play-controls");
    const hearBtn = UI().btn({ icon: "🔊", label: "Say it again", cls: "ctl",
      speak: "Say the word again", onClick: () => sayPrompt() });
    const hintBtn = UI().btn({ icon: "🍯", label: `Hint`, cls: "ctl ctl-hint",
      speak: "Get a hint", onClick: () => useHint() });
    updateHintLabel();
    controls.appendChild(hearBtn);
    controls.appendChild(hintBtn);
    stageEl.appendChild(controls);

    // --- ghost (reveal) line ---
    const ghost = el("div", "ghost-word");
    stageEl.appendChild(ghost);

    // --- slots ---
    const slotsEl = el("div", "slots mode-" + mode);
    letters.forEach(() => slotsEl.appendChild(el("span", "slot")));
    stageEl.appendChild(slotsEl);
    const slots = [...slotsEl.children];

    function updateHintLabel() {
      const lbl = hintBtn.querySelector(".btn-label");
      if (lbl) lbl.textContent = `Hint (${p.hints})`;
      hintBtn.classList.toggle("disabled", p.hints <= 0);
    }

    // Always introduce the word INSIDE its sentence, spoken clearly and slowly,
    // like a real spelling bee: "Your word is, when. As in, when will we go to
    // the mall? Your word is, when."
    const sentence = spec.s || `Here is the word: ${word}.`;
    function sayPrompt() {
      A().cancelVoice();
      return A().speak(`Your word is`, { rate: 0.82 })
        .then(() => A().wait(80))
        .then(() => A().speak(word + ".", { interrupt: false, rate: 0.72 }))
        .then(() => A().wait(220))
        .then(() => A().speak("As in...", { interrupt: false, rate: 0.85 }))
        .then(() => A().wait(120))
        .then(() => A().speak(sentence, { interrupt: false, rate: 0.9 }))
        .then(() => A().wait(260))
        .then(() => A().speak(`Your word is`, { interrupt: false, rate: 0.82 }))
        .then(() => A().speak(word + ".", { interrupt: false, rate: 0.7 }));
    }
    // Backwards-compatible alias used elsewhere.
    function sayWord() { return sayPrompt(); }
    function useHint() {
      if (p.hints <= 0) {
        A().sfx("wrong"); A().speak("No more honey hints. Buy more in the shop!");
        FX().shake(hintBtn); return;
      }
      S().useHint(opts.playerId); updateHintLabel();
      A().sfx("pop");
      // Reveal the first not-yet-correct letter + spell slowly.
      flashFirstLetter();
      A().speak("The word starts with").then(() =>
        A().speak(letterSpoken(letters[0]), { interrupt: false, rate: 0.8 })).then(() =>
        A().wait(150)).then(() => A().spellOut(word, { sayWord: true }));
    }
    function flashFirstLetter() {
      const i = currentIndex();
      const target = i < slots.length ? i : 0;
      slots[target].classList.add("hint-flash");
      slots[target].textContent = letters[target].toUpperCase();
      setTimeout(() => {
        if (mode === "type" && typed.length <= target) slots[target].textContent = "";
        slots[target].classList.remove("hint-flash");
      }, 1400);
    }

    function letterSpoken(ch) {
      const m = { a: "ay", e: "ee", i: "eye", o: "oh", u: "you" };
      return m[ch.toLowerCase()] || ch.toUpperCase();
    }

    function currentIndex() {
      if (mode === "type") return typed.length;
      return placed.findIndex((x) => x === null);
    }

    // intro audio
    if (opts.intro) setTimeout(sayWord, 250);

    /* ---------------- TYPE MODE (Alice) ---------------- */
    let typed = [];
    let keyboard, doneBtn, keyHandler;
    let micBtn = null, rec = null, listening = false;

    function buildTypeMode() {
      // Microphone row — spell out loud (it's a spelling bee!). Keyboard stays
      // below as a fallback, since letter recognition isn't perfect.
      if (A().canListen) {
        const micRow = el("div", "mic-row");
        micBtn = UI().btn({ icon: "🎤", label: "Spell out loud", cls: "mic-btn",
          speak: "Tap, then spell the word out loud", onClick: toggleVoice });
        micRow.appendChild(micBtn);
        stageEl.appendChild(micRow);
      }

      keyboard = el("div", "keyboard");
      const rows = ["abcdefg", "hijklmn", "opqrstu", "vwxyz"];
      rows.forEach((r) => {
        const rowEl = el("div", "kb-row");
        r.split("").forEach((ch) => {
          const k = el("button", "key");
          k.textContent = ch.toUpperCase();
          k.addEventListener("click", () => addLetter(ch));
          rowEl.appendChild(k);
        });
        keyboard.appendChild(rowEl);
      });
      // action row
      const actions = el("div", "kb-row kb-actions");
      const back = el("button", "key key-wide key-back");
      back.innerHTML = "⌫"; back.setAttribute("aria-label", "Backspace");
      back.addEventListener("click", removeLetter);
      const enter = el("button", "key key-wide key-enter");
      enter.innerHTML = "✅ Done"; enter.setAttribute("aria-label", "Done");
      enter.addEventListener("click", submit);
      doneBtn = enter;
      actions.appendChild(back); actions.appendChild(enter);
      keyboard.appendChild(actions);
      stageEl.appendChild(keyboard);

      keyHandler = (e) => {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        if (/^[a-zA-Z]$/.test(e.key)) { addLetter(e.key.toLowerCase()); e.preventDefault(); }
        else if (e.key === "Backspace") { removeLetter(); e.preventDefault(); }
        else if (e.key === "Enter") { submit(); e.preventDefault(); }
      };
      document.addEventListener("keydown", keyHandler);
    }

    function addLetter(ch) {
      if (typed.length >= letters.length) return;
      typed.push(ch);
      const slot = slots[typed.length - 1];
      slot.textContent = ch.toUpperCase();
      slot.classList.add("filled");
      A().sfx("tile");
      if (S().get().settings.letterEcho) A().speak(letterSpoken(ch), { rate: 1, pitch: 1.15 });
      FX().pulse(slot);
      // No auto-submit: when the word is full, nudge the Done button so she
      // gets a moment to check her work before committing.
      if (typed.length === letters.length && doneBtn) FX().pulse(doneBtn);
    }
    function removeLetter() {
      if (!typed.length) return;
      const slot = slots[typed.length - 1];
      slot.textContent = ""; slot.classList.remove("filled");
      typed.pop();
      A().sfx("click");
    }

    // Render a whole letter string at once (used by voice input). Keeps the
    // full string for checking, but only shows as many slots as the word has.
    function setTyped(str) {
      typed = str.split("");
      slots.forEach((s, i) => {
        if (i < str.length) { s.textContent = str[i].toUpperCase(); s.classList.add("filled"); }
        else { s.textContent = ""; s.classList.remove("filled"); }
      });
    }

    function setMicLabel(t) {
      if (micBtn) { const l = micBtn.querySelector(".btn-label"); if (l) l.textContent = t; }
    }
    function toggleVoice() {
      if (listening) { if (rec) { try { rec.stop(); } catch (e) {} } return; }
      listening = true;
      micBtn.classList.add("listening");
      setMicLabel("Listening…");
      showMascot("I'm listening! Say each letter out loud.");
      rec = A().startListen({
        onpartial: (lettersHeard) => { if (lettersHeard) setTyped(lettersHeard); },
        onresult: (lettersHeard) => { if (lettersHeard) setTyped(lettersHeard); },
        onerror: (code) => {
          listening = false; micBtn.classList.remove("listening"); setMicLabel("Spell out loud");
          if (code === "not-allowed" || code === "service-not-allowed") {
            A().speak("I need permission to use the microphone. You can tap the letters instead.");
          } else if (code === "no-speech") {
            A().speak("I didn't hear anything. Tap the microphone and try again.");
          }
        },
        onend: () => {
          listening = false; micBtn.classList.remove("listening"); setMicLabel("Spell out loud");
          const heard = typed.join("");
          if (!heard) {
            showMascot("Say each letter, like: see, ay, tee. Or tap the letters!");
            A().speak("I didn't catch the letters. Try saying each letter, like, see, ay, tee. Or tap them.");
            return;
          }
          setTimeout(submit, 450); // it's a spelling bee — check what she spelled
        }
      });
      if (!rec) { listening = false; micBtn.classList.remove("listening"); setMicLabel("Spell out loud"); }
    }

    /* ---------------- TILES MODE (Eddie) ---------------- */
    let placed = [];   // slot index -> tile element or null
    let tray;

    function buildTilesMode() {
      placed = letters.map(() => null);
      tray = el("div", "tile-tray");
      const order = shuffle(letters.map((ch, i) => ({ ch, id: i })));
      order.forEach((t) => {
        const tile = el("button", "tile");
        tile.textContent = t.ch.toUpperCase();
        tile.dataset.ch = t.ch;
        tile.addEventListener("click", () => placeTile(tile));
        tray.appendChild(tile);
      });
      stageEl.appendChild(tray);

      // tapping a filled slot returns its tile
      slots.forEach((s, i) => s.addEventListener("click", () => {
        if (placed[i]) returnTile(i);
      }));
    }

    function placeTile(tile) {
      const i = placed.findIndex((x) => x === null);
      if (i === -1) return;
      placed[i] = tile;
      const slot = slots[i];
      slot.textContent = tile.textContent;
      slot.classList.add("filled");
      tile.classList.add("used"); tile.disabled = true;
      A().sfx("tile");
      A().speak(letterSpoken(tile.dataset.ch), { rate: 0.95, pitch: 1.15 });
      FX().pulse(slot);
      if (placed.every((x) => x)) setTimeout(submit, 350);
    }
    function returnTile(i) {
      const tile = placed[i];
      if (!tile) return;
      tile.classList.remove("used"); tile.disabled = false;
      placed[i] = null;
      slots[i].textContent = ""; slots[i].classList.remove("filled");
      A().sfx("click");
    }

    /* ---------------- submit / check ---------------- */
    function currentGuess() {
      if (mode === "type") return typed.join("");
      return placed.map((t) => (t ? t.dataset.ch : "")).join("");
    }

    function submit() {
      const guess = currentGuess();
      if (guess.length < letters.length) {
        A().speak("Keep going! Add more letters.");
        return;
      }
      if (guess === word) {
        slots.forEach((s) => s.classList.add("correct"));
        cleanup();
        onResult({ firstTry: attempts === 0 && !revealed, attempts });
      } else {
        attempts++;
        slots.forEach((s) => s.classList.add("wrong"));
        FX().shake(slotsEl);
        A().sfx("wrong");
        const msg = pick(ENCOURAGE);
        if (attempts >= 2) {
          // 2nd miss: now we model it — reveal the word and spell it aloud so
          // she can copy and succeed. (Held back until now so the first try is
          // genuine recall, not dictation.)
          if (!revealed) {
            revealed = true;
            ghost.textContent = word.toUpperCase().split("").join(" ");
            ghost.classList.add("show");
          }
          showMascot("Here it is. Let's spell it together!");
          A().speak(msg).then(() => A().wait(220)).then(() => A().spellOut(word, { sayWord: true }));
        } else {
          // 1st miss: encourage and re-play the word in its sentence — no
          // spelling given away yet.
          showMascot(msg + " Let's listen again.");
          A().speak(msg).then(() => A().wait(220)).then(() => sayPrompt());
        }
        setTimeout(resetEntry, 700);
      }
    }

    function resetEntry() {
      slots.forEach((s) => { s.classList.remove("wrong", "correct", "filled"); s.textContent = ""; });
      if (mode === "type") { typed = []; }
      else {
        placed = placed.map(() => null);
        [...tray.children].forEach((t) => { t.classList.remove("used"); t.disabled = false; });
      }
    }

    function showMascot(text) {
      if (!opts.mascotSlot) return;
      opts.mascotSlot.innerHTML = "";
      opts.mascotSlot.appendChild(UI().mascot(text, { speak: false }));
    }

    function cleanup() {
      if (keyHandler) { document.removeEventListener("keydown", keyHandler); keyHandler = null; }
      if (rec) { try { rec.abort ? rec.abort() : rec.stop(); } catch (e) {} rec = null; }
      listening = false;
      if (activeWordCleanup === cleanup) activeWordCleanup = null;
    }

    if (mode === "type") buildTypeMode();
    else buildTilesMode();

    activeWordCleanup = cleanup; // so navigating away mid-word tears this down
    container._cleanup = cleanup;
  }

  /* ===================================================================
     CELEBRATION after a correct word (solo rounds)
     =================================================================== */
  function celebrate(ev, res, onDone) {
    const p = S().player();
    A().sfx("correct");
    UI().bumpCoins();
    const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
    FX().burst(cx, cy, p.theme, 30);

    // floating coin popup
    const coinsHud = document.getElementById("hudCoins");
    if (coinsHud) {
      const r = coinsHud.getBoundingClientRect();
      FX().popup(`+${ev.coins} 🪙`, r.left, r.top + 30, "coin");
    }
    FX().popup(`+${ev.xp} ⭐`, cx - 40, cy, "xp");

    const praise = ev.streakBonus ? `${pick(PRAISE)} ${ev.streak} in a row!` : pick(PRAISE);
    if (ev.streak === 5 || ev.streak === 10) A().sfx("streak");

    // queue of big celebrations (sticker / level / trophy)
    const cards = [];
    if (ev.sticker) cards.push({
      emoji: ev.sticker.e, title: "New Sticker!", sub: ev.sticker.name,
      sfx: "sticker", say: `You found a new sticker! ${ev.sticker.name}!`
    });
    if (ev.leveledUp) cards.push({
      emoji: "🎉", title: `Level ${ev.newLevel}!`, sub: ev.newBelt ? `${S().beltName(ev.newBelt)} Belt!` : "Level up!",
      sfx: "levelup", say: ev.newBelt ? `Level up! You earned the ${S().beltName(ev.newBelt)} belt!` : `Level up! You are level ${ev.newLevel}!`,
      big: true
    });
    (ev.trophies || []).forEach((t) => cards.push({
      emoji: t.emoji, title: "Trophy!", sub: t.name, sfx: "fanfare", say: `You won a trophy! ${t.name}!`
    }));

    A().speak(praise);

    if (!cards.length) { setTimeout(onDone, 950); return; }
    runCards(cards, 0);

    function runCards(list, i) {
      if (i >= list.length) { setTimeout(onDone, 250); return; }
      showRewardCard(list[i], () => runCards(list, i + 1));
    }
  }

  function showRewardCard(card, done) {
    const overlay = el("div", "reward-overlay");
    overlay.innerHTML =
      `<div class="reward-card ${card.big ? "big" : ""}">
         <div class="reward-emoji">${card.emoji}</div>
         <div class="reward-title">${card.title}</div>
         <div class="reward-sub">${card.sub}</div>
         <div class="reward-tap">tap to keep going ▶️</div>
       </div>`;
    document.body.appendChild(overlay);
    A().sfx(card.sfx);
    const p = S().player();
    FX().celebrate(p.theme);
    A().speak(card.say);
    requestAnimationFrame(() => overlay.classList.add("show"));
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 250);
      done();
    };
    overlay.addEventListener("click", () => { A().sfx("pop"); close(); });
    setTimeout(close, 2400); // auto-advance so a kid never gets stuck
  }

  /* ===================================================================
     ROUND SUMMARY
     =================================================================== */
  function roundSummary(cfg, stats) {
    UI().clear();
    UI().app.appendChild(UI().hud({ back: "menu" }));
    const p = S().player();
    const wrap = el("div", "screen summary");

    const star = stats.perfect ? "🌟🌟🌟" : stats.coins > 0 ? "🌟🌟" : "🌟";
    wrap.appendChild(el("div", "summary-stars", star));

    const msg = stats.perfect
      ? `WOW! A perfect round! Every word on the first try! Plus ${stats.perfectBonus ? stats.perfectBonus.bonus : 25} bonus coins!`
      : `Great job! You spelled ${stats.total} words and earned ${stats.coins} coins!`;
    wrap.appendChild(UI().mascot(msg, { bounce: true }));

    A().sfx(stats.perfect ? "win" : "fanfare");
    FX().celebrate(p.theme);

    const row = el("div", "summary-actions");
    const again = UI().btn({ icon: "🔁", label: "Play Again", cls: "btn-big btn-go",
      speak: "Play again!", onClick: () => {
        if (cfg.review) Game.startReview();
        else if (cfg.playerId === "eddie") Game.startEddie();
        else Game.startAlice(cfg.beltId);
      } });
    const menuBtn = UI().btn({ icon: "🏠", label: "Menu", cls: "btn-big",
      speak: "Back to the menu", onClick: () => UI().show("menu") });
    const shopBtn = UI().btn({ icon: "🛒", label: "Spend Coins", cls: "btn-big btn-shop",
      speak: "Go to the shop", onClick: () => UI().show("shop") });
    row.appendChild(again); row.appendChild(shopBtn); row.appendChild(menuBtn);
    wrap.appendChild(row);

    UI().app.appendChild(wrap);
  }

  /* ===================================================================
     VERSUS RACE  (Alice vs Eddie)
     =================================================================== */
  const FINISH = 8;
  Game.startVersus = function () {
    const racers = {
      alice: { id: "alice", name: "Alice", emoji: "👧", pos: 0,
        pool: shuffle(SB.WORDS.alice.belts.slice(0, 4).flatMap((b) => b.words)), pi: 0, mode: "type", color: "#ff8ac4" },
      eddie: { id: "eddie", name: "Eddie", emoji: "👦", pos: 0,
        pool: shuffle(SB.WORDS.eddie.words), pi: 0, mode: "tiles", color: "#5ad1ff" }
    };
    let turn = "alice";
    let winner = null;

    function render() {
      UI().clear();
      const wrap = el("div", "screen versus");
      // top bar (simple)
      const top = el("div", "versus-top");
      const home = UI().btn({ icon: "🏠", cls: "btn-round", speak: "Go home",
        onClick: () => UI().show("home") });
      top.appendChild(home);
      top.appendChild(el("div", "versus-title", "🏁 Spelling Race 🏁"));
      const mute = UI().btn({ icon: A().muted ? "🔇" : "🔊", cls: "btn-round",
        speak: "Sound", onClick: (e, b) => { A().muted = !A().muted; S().get().settings.muted = A().muted; S().save(); b.querySelector(".btn-ico").textContent = A().muted ? "🔇" : "🔊"; } });
      top.appendChild(mute);
      wrap.appendChild(top);

      // race track
      wrap.appendChild(track("alice"));
      wrap.appendChild(track("eddie"));

      const mascotSlot = el("div", "mascot-slot");
      wrap.appendChild(mascotSlot);
      const wordSlot = el("div", "word-slot");
      wrap.appendChild(wordSlot);

      UI().app.appendChild(wrap);

      const r = racers[turn];
      mascotSlot.appendChild(UI().mascot(`${r.name}'s turn! Spell your word!`, { bounce: true }));

      const spec = r.pool[r.pi % r.pool.length];
      r.pi++;
      playWord(wordSlot, spec, r.mode, { playerId: r.id, intro: true, mascotSlot }, (res) => {
        // award coins quietly to the player's profile too
        S().recordResult(r.id, { correct: true, firstTry: res.firstTry, word: spec.w });
        const step = res.firstTry ? 2 : 1;
        r.pos = Math.min(FINISH, r.pos + step);
        A().sfx("coin");
        FX().burst(window.innerWidth / 2, window.innerHeight * 0.5, "rainbow", 24);
        A().speak(`${r.name} moves ${step === 2 ? "two spaces" : "one space"}!`);
        if (r.pos >= FINISH) { winner = r; return setTimeout(showWin, 600); }
        turn = turn === "alice" ? "eddie" : "alice";
        setTimeout(render, 1100);
      });
    }

    function track(id) {
      const r = racers[id];
      const t = el("div", "race-track" + (turn === id ? " active" : ""));
      t.style.setProperty("--rc", r.color);
      const lane = el("div", "race-lane");
      for (let i = 0; i <= FINISH; i++) {
        const cell = el("span", "race-cell" + (i === FINISH ? " finish" : ""));
        if (i === FINISH) cell.textContent = "🏁";
        lane.appendChild(cell);
      }
      const racer = el("span", "racer");
      racer.textContent = r.emoji;
      racer.style.left = `calc(${(r.pos / FINISH) * 100}% - 18px)`;
      lane.appendChild(racer);
      t.appendChild(el("div", "race-name", `${r.emoji} ${r.name}`));
      t.appendChild(lane);
      return t;
    }

    function showWin() {
      UI().clear();
      const wrap = el("div", "screen versus-win");
      wrap.appendChild(el("div", "win-burst", `${winner.emoji}🏆`));
      wrap.appendChild(UI().mascot(`${winner.name} wins the spelling race! Hip hip hooray! Great spelling, both of you!`, { bounce: true }));
      A().sfx("win");
      FX().celebrate("rainbow");
      FX().rain("rainbow");
      const row = el("div", "summary-actions");
      row.appendChild(UI().btn({ icon: "🔁", label: "Race Again", cls: "btn-big btn-go",
        speak: "Race again!", onClick: () => Game.startVersus() }));
      row.appendChild(UI().btn({ icon: "🏠", label: "Home", cls: "btn-big",
        speak: "Go home", onClick: () => UI().show("home") }));
      wrap.appendChild(row);
      UI().app.appendChild(wrap);
    }

    A().speak("Spelling race! Alice versus Eddie! Ready, set, spell!");
    setTimeout(render, 1400);
  };

  SB.game = Game;
})();
