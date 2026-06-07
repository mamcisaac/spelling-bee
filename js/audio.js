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
    pitch: 1.05,
    voiceVolume: 1,
    sfxVolume: 0.6,
    muted: false,
    ctx: null,
    _unlocked: false,
    _queue: Promise.resolve()
  };

  /* ---------------- Voice (speechSynthesis) ---------------------------- */

  function pickBestVoice(list) {
    if (!list.length) return null;
    const score = (v) => {
      let s = 0;
      const lang = (v.lang || "").toLowerCase();
      if (lang.startsWith("en-ca")) s += 50;
      else if (lang.startsWith("en-gb")) s += 40;
      else if (lang.startsWith("en-au")) s += 30;
      else if (lang.startsWith("en-us")) s += 35;
      else if (lang.startsWith("en")) s += 20;
      const name = (v.name || "").toLowerCase();
      // Prefer warm, natural, kid-friendly voices when present.
      ["samantha", "karen", "moira", "tessa", "fiona", "google", "natural",
       "zoe", "ava", "allison", "susan", "female"].forEach((k, i) => {
        if (name.includes(k)) s += 12 - i * 0.3;
      });
      if (name.includes("compact") || name.includes("eloquence")) s -= 8;
      if (v.localService) s += 3;
      return s;
    };
    return list.slice().sort((a, b) => score(b) - score(a))[0];
  }

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

  // Speak text. Returns a Promise that resolves when finished (or skipped).
  Audio.speak = function (text, opts) {
    opts = opts || {};
    if (!("speechSynthesis" in window)) return Promise.resolve();
    if (Audio.muted && !opts.force) return Promise.resolve();
    if (opts.interrupt !== false) window.speechSynthesis.cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(String(text));
      if (Audio.voice) u.voice = Audio.voice;
      u.rate = opts.rate != null ? opts.rate : Audio.rate;
      u.pitch = opts.pitch != null ? opts.pitch : Audio.pitch;
      u.volume = opts.volume != null ? opts.volume : Audio.voiceVolume;
      u.lang = (Audio.voice && Audio.voice.lang) || "en-CA";
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      // Safety: never hang forever if the engine drops the event.
      const ms = 1400 + String(text).length * 95;
      setTimeout(finish, ms / Math.max(0.5, u.rate));
      // iOS Safari drops an utterance if speak() runs in the same tick as a
      // cancel(); a tiny gap after an interrupt makes it reliable.
      const go = () => { try { window.speechSynthesis.speak(u); } catch (e) { finish(); } };
      if (opts.interrupt !== false) setTimeout(go, 30); else go();
    });
  };

  // Chrome pauses speechSynthesis after ~15s of a long utterance/queue; this
  // nudge keeps long letter-by-letter spellings from stalling.
  if ("speechSynthesis" in window) {
    setInterval(() => {
      const ss = window.speechSynthesis;
      if (ss && ss.speaking && !ss.paused) { try { ss.resume(); } catch (e) {} }
    }, 6000);
  }

  // Spell a word out loud, one letter at a time, then say the whole word.
  // Used for hints and for showing the correct answer gently.
  Audio.spellOut = function (word, opts) {
    opts = opts || {};
    const letters = word.toUpperCase().split("");
    let p = Promise.resolve();
    letters.forEach((ch) => {
      p = p.then(() => Audio.speak(letterName(ch), {
        rate: opts.rate || 0.8, pitch: 1.1, interrupt: false
      })).then(() => wait(120));
    });
    if (opts.sayWord !== false) {
      p = p.then(() => wait(150))
           .then(() => Audio.speak(word, { rate: 0.9, interrupt: false }));
    }
    return p;
  };

  function letterName(ch) {
    // Make single letters read clearly (avoid "a" → long pause weirdness).
    const map = { A: "ay", E: "ee", I: "eye", O: "oh", U: "you" };
    return map[ch] || ch;
  }

  Audio.cancelVoice = function () {
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

  SB.audio = Audio;
})();
