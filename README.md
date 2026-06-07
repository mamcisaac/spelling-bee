# 🐝 Spelling Bee — Buzz, Spell, and Win!

A fun, **audio-driven** spelling game for two kids:

- **Alice** (8, Grade 2 🇨🇦) — a real spelling drill. She hears a word and **types**
  it. Canadian spellings (colour, favourite, neighbour…). Words are organised into
  karate-style **belts** that get harder, and the game **drills her weak spots**:
  words she misses keep coming back until they stick.
- **Eddie** (4, pre-reader) — he hears a word and **taps letter tiles** to build it.
  Every tile says its letter out loud. Starts with words he knows (stop, no, on,
  off, back) and simple sound-it-out CVC words (cat, dog, sun…).
- **Alice vs Eddie Race** — a friendly turn-based spelling race to the finish line.

## How to play

**Easiest:** double-click `index.html` — it opens in your browser and just works.
No install, no internet needed. Works offline.

*(Sound needs a real browser with a built-in voice — Safari or Chrome on Mac,
iPad, iPhone, or Android all work great. The first tap turns the sound on.)*

Best on a **tablet** (big tappable letters) but works on a computer too — Alice
can use the on-screen keyboard or her real keyboard.

> **Saving progress:** open it via a local web server (an `http://` address) or in
> **Chrome**. Safari opened straight from a `file://` path often refuses to save, so
> coins/stickers would reset each launch — the game shows a warning in Settings if
> that's happening. To serve locally: `cd spelling-bee && python3 -m http.server`,
> then open the printed `http://localhost:8000` link.

## How the learning works

- **Real spelling-bee delivery.** Every word is always read inside a sentence:
  *"Your word is, between. As in, sit between your two friends. Your word is,
  between."* — spoken slowly and clearly (no more bare, mumbled words).
- **🎤 Spell out loud.** It's a spelling bee — tap the mic and say the letters
  ("b… e… t… w… e… e… n"). Browser speech recognition isn't perfect at single
  letters, so the on-screen keyboard is always there as a fallback.
- **Grade-2 words.** Alice's lists are authentic Grade-2 vocabulary by pattern
  (short vowels, digraphs, blends, magic-e, vowel teams, r-controlled, oi/oy &
  ou/ow, and tricky Canadian words like *favourite, colour, neighbour*). Every
  topic is unlocked from the start.
- **Type it from memory first.** Alice hears the word and types it. We do **not**
  give away the spelling on the first miss — only after a *second* miss does Buzzy
  reveal and spell it out so she can copy and succeed. First attempts are real recall.
- **No auto-submit** — when the word is full she taps **✅ Done**, so she gets the
  habit of checking her work.
- **Adaptive drilling.** Words she misses are tracked and resurface far more often;
  words she nails first-try fade out. A word only counts as "mastered" (and toward
  belt completion) when she gets it right *without help*.
- **🎯 Review mode** pulls her trickiest words from *across every belt* into one
  focused round — the fastest way to fix weak spots.
- **Homophones get context.** Ambiguous-sounding words (for/four, here/hear,
  no/know…) are always read inside a sentence so they can be answered fairly.

## What makes it fun (so they want to practise)

- 🪙 **Coins** for every word — first-try is worth much more than a word that needed help
- ⭐ **XP, Levels & Belts** — level up with fanfare, earn White → Black belt
- 🔥 **Streaks** — consecutive *first-try* words build a coin multiplier (a missed
  word resets it, so the streak means something)
- 🎨 **29 collectible stickers** that drop as you play
- 🛒 **Shop** — spend coins on sticker packs, hats for Buzzy the Bee, confetti
  themes, and honey-hint refills
- 🏆 **11 trophies** for milestones
- ✨ **Perfect round** bonus when every word is first-try

## For grown-ups

- **Settings** (gear icon) lets you change the **voice**, **talking speed**,
  volumes, and toggle "say each letter while typing." There's also a reset button
  for each child (tap twice to confirm).
- Progress saves automatically in the browser (localStorage), separately for each
  child. Using the same browser keeps their coins and stickers.
- It's **kind by design**: wrong answers get a gentle sound and Buzzy spells the
  word out loud; after two tries the word is shown to copy, so a child always
  succeeds and stays motivated.

## Under the hood

Plain HTML/CSS/JavaScript, no build step, no dependencies.

```
index.html        – page + script load order
styles.css        – all styling
js/words.js       – word lists (Alice belts + Eddie words)
js/audio.js       – speech (Web Speech API) + sound effects (Web Audio)
js/state.js       – save data + the coin/XP/sticker/trophy economy
js/effects.js     – confetti, sparkles, popups
js/ui.js          – screens, HUD, mascot, navigation
js/game.js        – gameplay: typing, tiles, race, rewards, adaptive word picking
js/main.js        – boot
```

The `?v=` numbers on the script/style tags in `index.html` are just for cache-
busting; bump them if you edit a file and your browser shows a stale version.
