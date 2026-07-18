/* ===========================================================================
   audio.js — The voice + sound-effects engine.
   ---------------------------------------------------------------------------
   The whole game is AUDIO DRIVEN. Two pieces:
     1) Voice  — Web Speech API (speechSynthesis). Speaks words, instructions,
                 spells words letter-by-letter, reads sentences.
     2) SFX    — WebAudio API. All sounds are generated in code (no files), so
                 the game works offline by just opening index.html.
   =========================================================================== */
(function () {
  "use strict";
  window.SB = window.SB || {};

  const Audio = {
    voices: [],
    voice: null,
    rate: 0.95,
    pitch: 1.0,
    voiceVolume: 1,
    sfxVolume: 0.6,
    muted: false,
    ctx: null,
    _unlocked: false,
    _queue: Promise.resolve()
  };

  /* ---------------- Voice (speechSynthesis) ---------------------------- */

  // macOS ships dozens of *novelty* voices (Albert, Bubbles, Zarvox, Trinoids,
  // Whisper, Bad News, Jester…) that are unintelligible. Never pick these.
  const BAD_VOICES = ["albert", "bad news", "bahh", "bells", "boing", "bubbles",
    "cellos", "good news", "jester", "organ", "superstar", "trinoids", "whisper",
    "wobble", "zarvox", "fred", "ralph", "kathy", "junior", "deranged",
    "hysterical", "pipe organ", "grandma", "grandpa", "rocko", "shelley",
    "sandy", "flo", "eddy", "reed", "rishi", "novelty"];
  // High-quality voices worth preferring when installed.
  const GREAT_VOICES = ["samantha", "ava", "allison", "susan", "zoe", "joelle",
    "nicky", "tom", "evan", "nathan", "karen", "catherine", "matilda", "serena",
    "stephanie", "moira", "tessa", "fiona", "daniel", "kate", "oliver", "google"];

  function voiceScore(v) {
    const name = (v.name || "").toLowerCase();
    if (BAD_VOICES.some((b) => name.includes(b))) return -1000; // never
    let s = 0;
    const lang = (v.lang || "").toLowerCase();
    if (lang.startsWith("en-ca")) s += 50;
    else if (lang.startsWith("en-gb")) s += 42;
    else if (lang.startsWith("en-us")) s += 40;
    else if (lang.startsWith("en-au")) s += 30;
    else if (lang.startsWith("en")) s += 20;
    // Quality tiers — modern neural/enhanced voices sound far clearer.
    if (name.includes("(enhanced)") || name.includes("enhanced")) s += 30;
    if (name.includes("(premium)") || name.includes("premium")) s += 34;
    if (name.includes("neural") || name.includes("natural")) s += 28;
    if (name.includes("siri")) s += 26;
    if (name.includes("google")) s += 22;
    GREAT_VOICES.forEach((k, i) => { if (name.includes(k)) s += 16 - i * 0.2; });
    if (name.includes("compact") || name.includes("eloquence")) s -= 14;
    // Strongly prefer ON-DEVICE voices: remote ones (Chrome's "Google …")
    // fail SILENTLY when their service hiccups — the game just goes mute.
    if (v.localService) s += 20;
    return s;
  }

  function pickBestVoice(list) {
    if (!list.length) return null;
    const sorted = list.slice().sort((a, b) => voiceScore(b) - voiceScore(a));
    // Prefer the best NON-novelty voice; only ever fall back to a BAD_VOICES
    // match when literally every installed voice is one.
    const good = sorted.find((v) => voiceScore(v) > -1000);
    return good || sorted[0] || null;
  }

  // Voices for the settings UI: best-first, novelty voices filtered out —
  // unless they're all we have. Cheap, so it's computed fresh on each call.
  Audio.rankedVoices = function () {
    const sorted = Audio.voices.slice().sort((a, b) => voiceScore(b) - voiceScore(a));
    const good = sorted.filter((v) => voiceScore(v) > -1000);
    return good.length ? good : sorted;
  };

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    const list = window.speechSynthesis.getVoices() || [];
    if (!list.length) return;
    Audio.voices = list.filter((v) => (v.lang || "").toLowerCase().startsWith("en"));
    if (!Audio.voices.length) Audio.voices = list;
    // Respect a saved preference if it still exists.
    const savedName = SB.state && SB.state.get && SB.state.get().settings.voiceName;
    if (savedName) {
      const found = Audio.voices.find((v) => v.name === savedName);
      if (found) { Audio.voice = found; return; }
    }
    Audio.voice = pickBestVoice(Audio.voices);
  }

  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    // Safari sometimes needs a nudge.
    setTimeout(loadVoices, 300);
    setTimeout(loadVoices, 1200);
  }

  // Generation counter for chained speech (spellOut, prompts). Any interrupt
  // bumps it, which makes still-pending steps of an OLD chain no-ops — that's
  // what stops two prompts from talking over each other.
  let speakGen = 0;
  Audio.speakGen = function () { return speakGen; };

  // Speak text. Returns a Promise that resolves when finished (or skipped).
  Audio.speak = function (text, opts) {
    opts = opts || {};
    if (!("speechSynthesis" in window)) return Promise.resolve();
    if (Audio.muted && !opts.force) return Promise.resolve();
    if (opts.interrupt !== false) { speakGen++; window.speechSynthesis.cancel(); }
    const gen = speakGen;
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(String(text));
      // Only pin our chosen voice if the engine STILL lists it — a stale or
      // removed voice object makes some engines fail silently forever.
      const vs = window.speechSynthesis.getVoices() || [];
      const voiceOk = Audio.voice &&
        vs.some((v) => v.name === Audio.voice.name && v.lang === Audio.voice.lang);
      if (voiceOk) u.voice = Audio.voice;
      u.rate = opts.rate != null ? opts.rate : Audio.rate;
      u.pitch = opts.pitch != null ? opts.pitch : Audio.pitch;
      u.volume = opts.volume != null ? opts.volume : Audio.voiceVolume;
      u.lang = (voiceOk && Audio.voice.lang) || "en-CA";
      let done = false, started = false, watchdog = null;
      const finish = () => {
        if (done) return;
        done = true;
        if (watchdog) clearTimeout(watchdog);
        resolve();
      };
      u.onstart = () => { started = true; };
      u.onend = finish;
      u.onerror = finish;
      // Safety: never hang forever if the engine drops the event.
      const ms = 1400 + String(text).length * 95;
      setTimeout(finish, ms / Math.max(0.5, u.rate));
      // iOS Safari drops an utterance if speak() runs in the same tick as a
      // cancel(); a tiny gap after an interrupt makes it reliable.
      const go = () => {
        try { window.speechSynthesis.speak(u); } catch (e) { finish(); return; }
        // Watchdog: if the utterance never even STARTS (remote voice service
        // down, stale voice, engine wedged), retry ONCE with the engine's own
        // default voice — silence is the one failure kids can't recover from.
        watchdog = setTimeout(() => {
          if (started || done || gen !== speakGen || Audio.muted || document.hidden) return;
          try { window.speechSynthesis.cancel(); } catch (e) {}
          const u2 = new SpeechSynthesisUtterance(String(text));
          u2.rate = u.rate; u2.pitch = u.pitch; u2.volume = u.volume; // no voice pin
          u2.onend = finish; u2.onerror = finish;
          try { window.speechSynthesis.speak(u2); } catch (e) { finish(); }
        }, 1600);
      };
      if (opts.interrupt !== false) setTimeout(go, 30); else go();
    });
  };

  // Chrome pauses speechSynthesis after ~15s of a long utterance/queue; this
  // nudge keeps long letter-by-letter spellings from stalling. Also kick a
  // PAUSED engine (Chrome can wedge in that state and then everything is
  // silent until reload).
  if ("speechSynthesis" in window) {
    setInterval(() => {
      const ss = window.speechSynthesis;
      if (!ss) return;
      if (ss.paused || (ss.speaking && !ss.paused)) { try { ss.resume(); } catch (e) {} }
    }, 6000);
  }

  // Spell a word out loud, one letter at a time, then say the whole word.
  // Used for hints and for showing the correct answer gently.
  Audio.spellOut = function (word, opts) {
    opts = opts || {};
    const letters = word.toLowerCase().split("");
    // Capture the generation: if anything interrupts (a new prompt, screen
    // nav), the remaining letters silently stop instead of talking over it.
    const gen = speakGen;
    const live = () => gen === speakGen;
    let p = Promise.resolve();
    letters.forEach((ch) => {
      p = p.then(() => live() ? Audio.speak(Audio.letterName(ch), {
        rate: opts.rate || 0.85, pitch: 1.05, interrupt: false
      }) : null).then(() => live() ? wait(120) : null);
    });
    if (opts.sayWord !== false) {
      p = p.then(() => live() ? wait(150) : null)
           .then(() => live() ? Audio.speak(word, { rate: 0.9, interrupt: false }) : null);
    }
    return p;
  };

  // Single source of truth for how a letter is SPOKEN. Lowercase on purpose:
  // TTS voices read a lone uppercase letter as "Capital M", and phonetic hints
  // like "ay" get mispronounced ("ay" → sounds like "I"). A lone lowercase
  // letter is read as its letter name. Z is "zed" — Canadian English.
  Audio.letterName = function (ch) {
    const c = String(ch).toLowerCase();
    return c === "z" ? "zed" : c;
  };

  Audio.cancelVoice = function () {
    speakGen++; // kill any pending chained speech (spellOut / prompt steps)
    if ("speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
  };

  /* ---------------- Sound effects (WebAudio) --------------------------- */

  function ctx() {
    if (!Audio.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      Audio.ctx = new AC();
    }
    return Audio.ctx;
  }

  // Play a single tone with a soft attack/decay envelope.
  function tone(freq, start, dur, type, gain) {
    const c = ctx();
    if (!c) return;
    const t0 = c.currentTime + start;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t0);
    const peak = (gain == null ? 0.5 : gain) * Audio.sfxVolume;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  // A little noise burst (for sparkle / buzz textures).
  function noise(start, dur, gain, filterFreq) {
    const c = ctx();
    if (!c) return;
    const t0 = c.currentTime + start;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    const peak = (gain == null ? 0.2 : gain) * Audio.sfxVolume;
    g.gain.setValueAtTime(peak, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    if (filterFreq) {
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = filterFreq;
      src.connect(f).connect(g).connect(c.destination);
    } else {
      src.connect(g).connect(c.destination);
    }
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const N = { // note frequencies
    C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, B4: 493.9,
    C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784.0, A5: 880.0, B5: 987.8,
    C6: 1046.5, D6: 1174.7, E6: 1318.5, G6: 1568.0
  };

  const SFX = {
    click() { tone(660, 0, 0.08, "triangle", 0.28); },
    pop() { tone(880, 0, 0.06, "sine", 0.3); tone(1320, 0.02, 0.06, "sine", 0.18); },
    tile() { tone(523, 0, 0.07, "triangle", 0.3); tone(784, 0.03, 0.08, "triangle", 0.2); },
    whoosh() { noise(0, 0.25, 0.12, 800); },
    correct() {
      tone(N.E5, 0, 0.12, "triangle", 0.4);
      tone(N.G5, 0.1, 0.12, "triangle", 0.4);
      tone(N.C6, 0.2, 0.22, "triangle", 0.42);
      noise(0.2, 0.25, 0.05, 5000);
    },
    wrong() { // gentle, never harsh — we don't want to discourage kids
      tone(330, 0, 0.16, "sine", 0.32);
      tone(247, 0.12, 0.22, "sine", 0.3);
    },
    coin() {
      tone(N.B5, 0, 0.07, "square", 0.22);
      tone(N.E6, 0.06, 0.14, "square", 0.22);
    },
    sticker() {
      tone(N.C6, 0, 0.09, "sine", 0.35);
      tone(N.E6, 0.08, 0.09, "sine", 0.35);
      tone(N.G6, 0.16, 0.18, "sine", 0.38);
      noise(0, 0.4, 0.06, 6000);
    },
    streak() {
      [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.05, 0.12, "triangle", 0.3));
    },
    levelup() {
      const seq = [N.C5, N.E5, N.G5, N.C6, N.E6, N.G6];
      seq.forEach((f, i) => tone(f, i * 0.09, 0.18, "triangle", 0.4));
      tone(N.C6, seq.length * 0.09, 0.4, "triangle", 0.42);
      noise(0, 0.6, 0.05, 6000);
    },
    fanfare() {
      const m = [
        [N.G4, 0], [N.C5, 0.12], [N.E5, 0.24], [N.G5, 0.36],
        [N.E5, 0.5], [N.G5, 0.6], [N.C6, 0.74]
      ];
      m.forEach(([f, t]) => tone(f, t, 0.22, "triangle", 0.4));
      tone(N.C6, 0.74, 0.5, "triangle", 0.42);
    },
    drumroll() {
      for (let i = 0; i < 16; i++) noise(i * 0.05, 0.04, 0.14, 1500);
    },
    win() {
      const m = [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6, N.E6, N.C6];
      m.forEach((f, i) => tone(f, i * 0.13, 0.24, "triangle", 0.42));
      noise(0, 1.0, 0.05, 6000);
    },
    buzz() { // friendly bee buzz for the mascot
      const c = ctx(); if (!c) return;
      const t0 = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(180, t0);
      osc.frequency.linearRampToValueAtTime(140, t0 + 0.18);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(0.12 * Audio.sfxVolume, t0 + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      const lfo = c.createOscillator(); const lg = c.createGain();
      lfo.frequency.value = 35; lg.gain.value = 20;
      lfo.connect(lg).connect(osc.frequency);
      osc.connect(g).connect(c.destination);
      osc.start(t0); lfo.start(t0); osc.stop(t0 + 0.22); lfo.stop(t0 + 0.22);
    }
  };

  Audio.sfx = function (name) {
    if (Audio.muted) return;
    const fn = SFX[name];
    if (fn) { try { fn(); } catch (e) {} }
  };

  /* ---------------- Unlock + settings ---------------------------------- */

  // Browsers require a user gesture before audio can play. Call on first tap.
  Audio.unlock = function () {
    if (Audio._unlocked) return;
    Audio._unlocked = true;
    const c = ctx();
    if (c && c.state === "suspended") c.resume();
    // Warm up speech synthesis with a silent utterance.
    if ("speechSynthesis" in window) {
      try {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0; window.speechSynthesis.speak(u);
      } catch (e) {}
    }
  };

  Audio.applySettings = function (s) {
    if (!s) return;
    if (s.rate != null) Audio.rate = s.rate;
    if (s.voiceVolume != null) Audio.voiceVolume = s.voiceVolume;
    if (s.sfxVolume != null) Audio.sfxVolume = s.sfxVolume;
    if (s.muted != null) Audio.muted = s.muted;
    if (s.voiceName) {
      const v = Audio.voices.find((x) => x.name === s.voiceName);
      if (v) Audio.voice = v;
    }
  };

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  Audio.wait = wait;

  /* ---------------- Speech recognition (spelling out loud) ------------- */
  // It's a spelling bee — kids can SAY the letters. Browser speech recognition
  // is imperfect at single letters, so we parse generously and always keep the
  // keyboard as a fallback.
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  Audio.canListen = !!SpeechRec;

  // Map spoken letter-names (and their common homophones) to letters.
  const LETTER_WORDS = {
    "ay": "a", "eh": "a", "a": "a",
    "bee": "b", "be": "b", "b": "b",
    "see": "c", "sea": "c", "cee": "c", "c": "c",
    "dee": "d", "d": "d",
    "ee": "e", "e": "e",
    "ef": "f", "eff": "f", "f": "f",
    "gee": "g", "g": "g",
    "aitch": "h", "haitch": "h", "h": "h",
    "eye": "i", "i": "i",
    "jay": "j", "j": "j",
    "kay": "k", "k": "k",
    "el": "l", "ell": "l", "l": "l",
    "em": "m", "m": "m",
    "en": "n", "n": "n",
    "oh": "o", "o": "o",
    "pee": "p", "pea": "p", "p": "p",
    "cue": "q", "queue": "q", "kew": "q", "q": "q",
    "ar": "r", "are": "r", "arr": "r", "r": "r",
    "es": "s", "ess": "s", "s": "s",
    "tee": "t", "tea": "t", "t": "t",
    "you": "u", "yu": "u", "u": "u",
    "vee": "v", "v": "v",
    "doubleu": "w", "doubleyou": "w", "w": "w",
    "ex": "x", "x": "x",
    "why": "y", "y": "y",
    "zee": "z", "zed": "z", "z": "z"
  };

  // Turn a spoken transcript ("see, ay, tee" or "c a t") into letters ("cat").
  // Returns "" if it couldn't find clear letters (e.g. the child said the whole
  // word). We deliberately do NOT expand a whole spoken word into its spelling.
  //
  // `expect` (optional): the REMAINING letters of the answer. Recognizers love
  // to fuse spoken letter-names into a word ("el ay em" -> "lamb"); when that
  // fused word lines up with the letters we're expecting next ("lamb" vs
  // "lamp" -> "lam"), credit the overlap. This INCLUDES the fused word that
  // completes the whole answer: while a child spells W-I-N-D the recognizer
  // builds "w","wi","win" and then collapses the final result into the real
  // word "wind" — if we refused that (because it equals the answer) the last
  // letter would silently vanish and she'd be stuck with "win" / "des".
  // Down side: just SAYING the word surfaces the same fused transcript, so we
  // can't tell "spelled it" from "said it" — completing the spelling wins.
  Audio.spokenToLetters = function (transcript, expect) {
    if (!transcript) return "";
    let t = (" " + transcript.toLowerCase() + " ")
      .replace(/[.,!?;:'"-]/g, " ")
      .replace(/\bdouble\s+/g, " double");      // "double u" -> "doubleu"
    const tokens = t.split(/\s+/).filter(Boolean);
    let out = "";
    for (const tok of tokens) {
      // Check letter-names first so "double-u"/"double-you" => W (not "uu").
      if (LETTER_WORDS[tok]) { out += LETTER_WORDS[tok]; continue; }
      const dm = tok.match(/^double(.+)$/);     // "double-l" -> two L's
      if (dm) {
        const base = LETTER_WORDS[dm[1]] || (dm[1].length === 1 ? dm[1] : "");
        if (base) { out += base + base; continue; }
      }
      if (/^[a-z]$/.test(tok)) { out += tok; continue; }
      // Fused-letters recovery: a non-letter word that (almost) entirely
      // matches the next expected letters is a garbled spelling, not a word.
      // A fused word that matches the answer EXACTLY (tok === expect) is the
      // end-of-spelling collapse — accept it so the final letter isn't dropped.
      if (expect) {
        const rem = expect.slice(out.length);
        let cp = 0;
        while (cp < tok.length && cp < rem.length && tok[cp] === rem[cp]) cp++;
        if (cp >= 2 && cp >= tok.length - 1) { out += tok.slice(0, cp); continue; }
      }
      // multi-letter real word that isn't a letter-name -> ignore
    }
    return out;
  };

  // Start listening. Calls back with the best letter-string we can parse.
  // opts: { expect (remaining answer letters, for fused-word recovery),
  //         onpartial(letters,raw), onresult(letters,raw), onerror(code), onend() }
  Audio.startListen = function (opts) {
    opts = opts || {};
    if (!Audio.canListen) { opts.onerror && opts.onerror("unsupported"); return null; }
    Audio.cancelVoice();           // don't record our own narration
    let rec;
    try { rec = new SpeechRec(); } catch (e) { opts.onerror && opts.onerror("init"); return null; }
    rec.lang = (Audio.voice && Audio.voice.lang) || "en-CA";
    rec.interimResults = true;
    rec.maxAlternatives = 4;
    // Kids say letters one at a time with pauses; continuous keeps the session
    // alive between letters instead of ending at the first silence. (Sessions
    // can still end on their own — game.js restarts them while listening.)
    rec.continuous = true;
    // Session letters are MONOTONIC: Safari freely rewrites its whole result
    // list mid-session (often fusing letter-names into a word that parses to
    // fewer letters). A rewrite may replace what we show, but never shrink it —
    // shrinking is how letters the child already saw used to vanish and get
    // overwritten by the next thing she said.
    const expect = opts.expect || "";
    let shown = "", shownRaw = "";
    rec.onresult = (e) => {
      // Rebuild from the FULL result list every event (not resultIndex):
      // Safari re-reports earlier results, and appending would duplicate them.
      let acc = "", raw = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const rem = expect.slice(acc.length);
        // try every alternative, keep the one that yields the most letters
        let best = r[0].transcript, bestLen = Audio.spokenToLetters(r[0].transcript, rem).length;
        for (let a = 1; a < r.length; a++) {
          const len = Audio.spokenToLetters(r[a].transcript, rem).length;
          if (len > bestLen) { best = r[a].transcript; bestLen = len; }
        }
        acc += Audio.spokenToLetters(best, rem);
        raw += " " + best;
      }
      if (acc.length >= shown.length) { shown = acc; shownRaw = raw.trim(); }
      opts.onpartial && opts.onpartial(shown, shownRaw);
    };
    rec.onerror = (e) => { opts.onerror && opts.onerror(e.error || "error"); };
    rec.onend = () => {
      // Report exactly what the partials showed — the fold-in must match the
      // screen, or the next session starts from a different string than the
      // child is looking at.
      opts.onresult && opts.onresult(shown, shownRaw);
      opts.onend && opts.onend();
    };
    try { rec.start(); } catch (e) { opts.onerror && opts.onerror("start"); return null; }
    return rec;
  };

  SB.audio = Audio;
})();
