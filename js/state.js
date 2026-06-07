/* ===========================================================================
   state.js — Saves progress and runs the reward economy.
   ---------------------------------------------------------------------------
   Each player (Alice, Eddie) has their own profile: coins, XP, level, belt,
   stickers collected, trophies, shop purchases, streak records, words mastered.
   Stored in localStorage; falls back to in-memory if storage is blocked
   (e.g. some browsers on file://).
   =========================================================================== */
(function () {
  "use strict";
  window.SB = window.SB || {};

  const KEY = "spellingBee.v1";

  // ---- Collectible definitions ----------------------------------------
  // Stickers are emoji so the game needs zero image files.
  const STICKERS = [
    // packs unlock more variety; each has a rarity weight
    { id: "bee", e: "🐝", name: "Buzzy Bee", pack: "starter", w: 10 },
    { id: "star", e: "⭐", name: "Gold Star", pack: "starter", w: 10 },
    { id: "heart", e: "❤️", name: "Big Heart", pack: "starter", w: 10 },
    { id: "rainbow", e: "🌈", name: "Rainbow", pack: "starter", w: 8 },
    { id: "flower", e: "🌸", name: "Flower", pack: "starter", w: 9 },
    { id: "sun", e: "☀️", name: "Sunshine", pack: "starter", w: 9 },
    { id: "cat", e: "🐱", name: "Kitty", pack: "animals", w: 8 },
    { id: "dog", e: "🐶", name: "Puppy", pack: "animals", w: 8 },
    { id: "fox", e: "🦊", name: "Clever Fox", pack: "animals", w: 6 },
    { id: "frog", e: "🐸", name: "Hoppy Frog", pack: "animals", w: 7 },
    { id: "owl", e: "🦉", name: "Wise Owl", pack: "animals", w: 5 },
    { id: "uni", e: "🦄", name: "Unicorn", pack: "animals", w: 3 },
    { id: "rocket", e: "🚀", name: "Rocket", pack: "space", w: 6 },
    { id: "planet", e: "🪐", name: "Planet", pack: "space", w: 5 },
    { id: "alien", e: "👽", name: "Friendly Alien", pack: "space", w: 4 },
    { id: "comet", e: "☄️", name: "Comet", pack: "space", w: 4 },
    { id: "astro", e: "🧑‍🚀", name: "Astronaut", pack: "space", w: 3 },
    { id: "moon", e: "🌙", name: "Crescent Moon", pack: "space", w: 6 },
    { id: "cake", e: "🍰", name: "Cake Slice", pack: "treats", w: 7 },
    { id: "donut", e: "🍩", name: "Donut", pack: "treats", w: 7 },
    { id: "ice", e: "🍦", name: "Ice Cream", pack: "treats", w: 7 },
    { id: "candy", e: "🍭", name: "Lollipop", pack: "treats", w: 6 },
    { id: "cookie", e: "🍪", name: "Cookie", pack: "treats", w: 7 },
    { id: "pizza", e: "🍕", name: "Pizza", pack: "treats", w: 5 },
    { id: "trophy", e: "🏆", name: "Trophy", pack: "champ", w: 3 },
    { id: "medal", e: "🥇", name: "Gold Medal", pack: "champ", w: 4 },
    { id: "crown", e: "👑", name: "Crown", pack: "champ", w: 2 },
    { id: "gem", e: "💎", name: "Diamond", pack: "champ", w: 2 },
    { id: "dragon", e: "🐲", name: "Spelling Dragon", pack: "champ", w: 1 }
  ];

  // Shop items: spend coins. Some unlock sticker packs, some are cosmetic
  // hats for the mascot, some are helpful (extra hints).
  const SHOP = [
    { id: "pack_animals", type: "pack", pack: "animals", name: "Animal Sticker Pack", emoji: "🐾", cost: 60, say: "the animal sticker pack" },
    { id: "pack_space", type: "pack", pack: "space", name: "Space Sticker Pack", emoji: "🚀", cost: 120, say: "the space sticker pack" },
    { id: "pack_treats", type: "pack", pack: "treats", name: "Yummy Treats Pack", emoji: "🍩", cost: 100, say: "the treats sticker pack" },
    { id: "pack_champ", type: "pack", pack: "champ", name: "Champion Pack", emoji: "🏆", cost: 250, say: "the champion sticker pack" },
    { id: "hat_party", type: "hat", emoji: "🎉", hat: "🎉", name: "Party Hat for Buzzy", cost: 40, say: "a party hat for Buzzy the bee" },
    { id: "hat_crown", type: "hat", emoji: "👑", hat: "👑", name: "Royal Crown for Buzzy", cost: 150, say: "a royal crown for Buzzy" },
    { id: "hat_wizard", type: "hat", emoji: "🧙", hat: "🎩", name: "Wizard Hat for Buzzy", cost: 90, say: "a magic wizard hat for Buzzy" },
    { id: "theme_rainbow", type: "theme", theme: "rainbow", emoji: "🌈", name: "Rainbow Confetti", cost: 50, say: "rainbow confetti" },
    { id: "theme_stars", type: "theme", theme: "stars", emoji: "✨", name: "Star Sparkles", cost: 50, say: "star sparkles" },
    { id: "hints3", type: "hints", amount: 5, emoji: "🍯", name: "5 Honey Hints", cost: 30, say: "five honey hints" }
  ];

  // Trophies: milestone badges.
  const TROPHIES = [
    { id: "first", emoji: "🌟", name: "First Word!", test: (p) => p.totalCorrect >= 1 },
    { id: "ten", emoji: "🔟", name: "Ten Words", test: (p) => p.totalCorrect >= 10 },
    { id: "fifty", emoji: "🏅", name: "Fifty Words", test: (p) => p.totalCorrect >= 50 },
    { id: "hundred", emoji: "💯", name: "One Hundred Words", test: (p) => p.totalCorrect >= 100 },
    { id: "streak5", emoji: "🔥", name: "Hot Streak", test: (p) => p.bestStreak >= 5 },
    { id: "streak10", emoji: "⚡", name: "On Fire", test: (p) => p.bestStreak >= 10 },
    { id: "perfect", emoji: "✨", name: "Perfect Round", test: (p) => p.perfectRounds >= 1 },
    { id: "level5", emoji: "🎖️", name: "Level 5", test: (p) => p.level >= 5 },
    { id: "level10", emoji: "🏆", name: "Level 10", test: (p) => p.level >= 10 },
    { id: "collector", emoji: "📚", name: "Sticker Collector", test: (p) => Object.keys(p.stickers || {}).length >= 12 },
    { id: "rich", emoji: "💰", name: "Coin Master", test: (p) => p.coinsEverEarned >= 500 }
  ];

  // Belt order mirrors Alice's word belts (used as rank titles for both).
  const BELT_ORDER = ["white", "yellow", "orange", "green", "blue", "purple", "brown", "red", "black"];

  function freshPlayer(name) {
    return {
      name: name,
      coins: 0,
      coinsEverEarned: 0,
      xp: 0,
      level: 1,
      belt: "white",
      streak: 0,
      bestStreak: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      perfectRounds: 0,
      hints: 3,
      stickers: {},            // id -> count
      packs: { starter: true }, // unlocked sticker packs
      shop: {},                // purchased item ids
      hat: null,               // equipped mascot hat emoji
      theme: "confetti",       // celebration theme
      trophies: {},            // id -> true
      mastered: {},            // word -> times correct
      struggle: {},            // word -> times missed (drives spaced repetition)
      beltProgress: {}         // beltId -> count of distinct words mastered
    };
  }

  function freshData() {
    return {
      players: { alice: freshPlayer("Alice"), eddie: freshPlayer("Eddie") },
      settings: { rate: 0.95, voiceVolume: 1, sfxVolume: 0.6, muted: false, voiceName: null, letterEcho: true },
      current: "alice"
    };
  }

  const State = {
    data: null,
    _mem: false
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return migrate(parsed);
      }
    } catch (e) {
      State._mem = true;
    }
    return freshData();
  }

  function migrate(d) {
    const base = freshData();
    d.settings = Object.assign(base.settings, d.settings || {});
    d.players = d.players || {};
    ["alice", "eddie"].forEach((id) => {
      d.players[id] = Object.assign(freshPlayer(base.players[id].name), d.players[id] || {});
    });
    if (!d.current) d.current = "alice";
    return d;
  }

  State.save = function () {
    if (State._mem) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(State.data));
    } catch (e) {
      State._mem = true;
    }
  };

  State.get = function () { return State.data; };
  State.player = function (id) {
    return State.data.players[id || State.data.current];
  };
  State.currentId = function () { return State.data.current; };
  State.setCurrent = function (id) { State.data.current = id; State.save(); };

  /* ---- XP / levels / belts ------------------------------------------- */
  // XP needed to reach the NEXT level from the start of `level`.
  State.xpForLevel = function (level) { return 50 + (level - 1) * 30; };

  State.beltForLevel = function (level) {
    // Every ~2 levels = next belt, capped at black.
    const idx = Math.min(BELT_ORDER.length - 1, Math.floor((level - 1) / 1.6));
    return BELT_ORDER[idx];
  };
  State.beltName = function (id) {
    const map = { white: "White", yellow: "Yellow", orange: "Orange", green: "Green",
      blue: "Blue", purple: "Purple", brown: "Brown", red: "Red", black: "Black" };
    return map[id] || id;
  };
  State.BELT_ORDER = BELT_ORDER;

  /* ---- Awarding (the fun part) --------------------------------------- */
  // Returns an "events" object the UI uses to celebrate.
  State.recordResult = function (playerId, opts) {
    const p = State.player(playerId);
    const ev = { coins: 0, xp: 0, leveledUp: false, newLevel: null, newBelt: null,
      sticker: null, trophies: [], streak: p.streak, streakBonus: false };

    p.totalAttempts++;
    if (!opts.correct) {
      p.streak = 0;
      State.save();
      ev.streak = 0;
      return ev;
    }

    p.totalCorrect++;

    // Streak counts FIRST-TRY words only, so it reflects real accuracy rather
    // than just persistence. Any word that needed a retry breaks the streak.
    if (opts.firstTry) p.streak++; else p.streak = 0;
    if (p.streak > p.bestStreak) p.bestStreak = p.streak;
    ev.streak = p.streak;

    // Per-word tracking drives spaced repetition AND honest belt progress:
    //   first-try  -> mastered (counts toward belt completion)
    //   needed help -> struggle (the word resurfaces more often, and does NOT
    //                  count as mastered even though it was eventually correct)
    const word = opts.word;
    if (word) {
      if (opts.firstTry) {
        p.mastered[word] = (p.mastered[word] || 0) + 1;
        if (opts.belt) {
          p.beltProgress[opts.belt] = p.beltProgress[opts.belt] || {};
          p.beltProgress[opts.belt][word] = true;
        }
      } else {
        p.struggle[word] = (p.struggle[word] || 0) + 1;
      }
    }

    // Coins + XP. First-try is worth more (rewards real recall, not copying).
    let baseCoins = opts.firstTry ? 10 : 3;
    let baseXp = opts.firstTry ? 12 : 5;
    // Gentle streak multiplier: +25% per 4 first-try in a row, capped at 2x.
    const mult = Math.min(2, 1 + Math.floor(p.streak / 4) * 0.25);
    if (mult > 1) ev.streakBonus = true;
    ev.coins = Math.round(baseCoins * mult);
    ev.xp = Math.round(baseXp * mult);

    p.coins += ev.coins;
    p.coinsEverEarned += ev.coins;
    p.xp += ev.xp;

    // Level ups (may cross several at once)
    while (p.xp >= State.xpForLevel(p.level)) {
      p.xp -= State.xpForLevel(p.level);
      p.level++;
      ev.leveledUp = true;
      ev.newLevel = p.level;
      const belt = State.beltForLevel(p.level);
      if (belt !== p.belt) { p.belt = belt; ev.newBelt = belt; }
    }

    // Sticker drop: 28% on first try, plus guaranteed on level up.
    if ((opts.firstTry && Math.random() < 0.28) || ev.leveledUp) {
      const s = State.randomSticker(p);
      if (s) { p.stickers[s.id] = (p.stickers[s.id] || 0) + 1; ev.sticker = s; }
    }

    // Trophies
    ev.trophies = State.checkTrophies(p);

    State.save();
    return ev;
  };

  State.recordPerfectRound = function (playerId) {
    const p = State.player(playerId);
    p.perfectRounds++;
    p.coins += 25; p.coinsEverEarned += 25;
    const trophies = State.checkTrophies(p);
    State.save();
    return { bonus: 25, trophies };
  };

  State.randomSticker = function (p) {
    const pool = STICKERS.filter((s) => p.packs[s.pack]);
    if (!pool.length) return null;
    const total = pool.reduce((n, s) => n + s.w, 0);
    let r = Math.random() * total;
    for (const s of pool) { r -= s.w; if (r <= 0) return s; }
    return pool[pool.length - 1];
  };

  State.checkTrophies = function (p) {
    const gained = [];
    TROPHIES.forEach((t) => {
      if (!p.trophies[t.id] && t.test(p)) { p.trophies[t.id] = true; gained.push(t); }
    });
    return gained;
  };

  State.buy = function (playerId, itemId) {
    const p = State.player(playerId);
    const item = SHOP.find((s) => s.id === itemId);
    if (!item) return { ok: false, reason: "missing" };
    const owned = !!p.shop[itemId] && item.type !== "hints";
    if (owned) return { ok: false, reason: "owned" };
    if (p.coins < item.cost) return { ok: false, reason: "broke" };
    p.coins -= item.cost;
    p.shop[itemId] = true;
    if (item.type === "pack") p.packs[item.pack] = true;
    if (item.type === "hints") p.hints += item.amount;
    State.save();
    return { ok: true, item };
  };

  State.equipHat = function (playerId, hat) {
    const p = State.player(playerId);
    p.hat = (p.hat === hat) ? null : hat;
    State.save();
  };
  State.setTheme = function (playerId, theme) {
    const p = State.player(playerId);
    p.theme = theme; State.save();
  };
  State.useHint = function (playerId) {
    const p = State.player(playerId);
    if (p.hints > 0) { p.hints--; State.save(); return true; }
    return false;
  };

  State.resetPlayer = function (playerId) {
    const d = State.data;
    d.players[playerId] = freshPlayer(d.players[playerId].name);
    State.save();
  };

  State.STICKERS = STICKERS;
  State.SHOP = SHOP;
  State.TROPHIES = TROPHIES;

  // Initialise
  State.data = load();
  SB.state = State;
})();
