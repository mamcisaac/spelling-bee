/* ===========================================================================
   words.js — Word lists for the Spelling Bee game
   ---------------------------------------------------------------------------
   Two learners:
     • Alice — 8 yrs, Grade 2, Canada. Real spelling drill (types the word).
               Canadian spellings used where relevant (colour, favourite...).
               Organised into "belts" (karate-style levels) that get harder.
     • Eddie — 4 yrs, pre-reader. Knows: stop, no, on, off, back. Can sound out
               simple CVC words. He builds words by TAPPING letter tiles, not
               typing. Words are short and decodable.

   Each word entry:
     { w: "cat", s: "The cat sat on the soft mat." }
       w = the word (lowercase)
       s = a kid-friendly sentence using the word (optional, for "use it in a
           sentence" audio). If omitted, the game makes a simple one.
   =========================================================================== */
(function () {
  "use strict";
  window.SB = window.SB || {};

  /* ---- Alice: leveled belts ------------------------------------------- */
  const aliceBelts = [
    {
      id: "white", name: "White Belt", emoji: "⬜", color: "#f4f4f8",
      blurb: "Short and snappy words. You can do it!",
      words: [
        { w: "cat", s: "The cat sat on the soft mat." },
        { w: "dog", s: "My dog can run very fast." },
        { w: "sun", s: "The sun is big and bright." },
        { w: "hat", s: "Put the red hat on your head." },
        { w: "bed", s: "I sleep in my cozy bed." },
        { w: "pig", s: "The pig rolled in the mud." },
        { w: "top", s: "The toy top can spin and spin." },
        { w: "cup", s: "I drink milk from my cup." },
        { w: "red", s: "The apple is bright red." },
        { w: "box", s: "The cat hid in the box." },
        { w: "fun", s: "We had so much fun today." },
        { w: "ten", s: "I can count to ten." },
        { w: "jam", s: "I like jam on my toast." },
        { w: "bug", s: "A little bug crawled on the leaf." },
        { w: "net", s: "We caught the fish in a net." },
        { w: "mud", s: "My boots are full of mud." }
      ]
    },
    {
      id: "yellow", name: "Yellow Belt", emoji: "🟨", color: "#ffe44d",
      blurb: "Sneaky little words we use every day.",
      words: [
        { w: "the", s: "The dog ran to the park." },
        { w: "was", s: "It was a sunny day." },
        { w: "said", s: "Mom said it is time for bed." },
        { w: "they", s: "They went to the store." },
        { w: "have", s: "I have two red mittens." },
        { w: "with", s: "Come and play with me." },
        { w: "this", s: "This is my favourite book." },
        { w: "that", s: "That puppy is so soft." },
        { w: "what", s: "What is your name?" },
        { w: "when", s: "When can we go outside?" },
        { w: "them", s: "I gave the toys to them." },
        { w: "were", s: "We were happy at the party." },
        { w: "your", s: "Where is your jacket?" },
        { w: "here", s: "Please come over here." },
        { w: "there", s: "Your shoes are over there." },
        { w: "from", s: "This card is from my friend." }
      ]
    },
    {
      id: "orange", name: "Orange Belt", emoji: "🟧", color: "#ff9f3a",
      blurb: "Two letters, one sound: sh, ch, th, wh.",
      words: [
        { w: "ship", s: "The big ship sailed on the sea." },
        { w: "shop", s: "We went to the toy shop." },
        { w: "fish", s: "The fish swam in the pond." },
        { w: "wish", s: "I made a wish on a star." },
        { w: "chip", s: "I ate one crunchy chip." },
        { w: "chin", s: "He bumped his chin." },
        { w: "chop", s: "Dad will chop the carrots." },
        { w: "much", s: "Thank you so much!" },
        { w: "such", s: "It was such a fun day." },
        { w: "thin", s: "The ice was very thin." },
        { w: "bath", s: "I take a bath at night." },
        { w: "math", s: "I like to do math at school." },
        { w: "path", s: "We walked down the path." },
        { w: "wheel", s: "The wheel on the bike is round." },
        { w: "white", s: "The snow is fluffy and white." },
        { w: "thank", s: "I say thank you to my friend." }
      ]
    },
    {
      id: "green", name: "Green Belt", emoji: "🟩", color: "#5ad17a",
      blurb: "Two letters at the start: blends!",
      words: [
        { w: "stop", s: "We stop at the red light." },
        { w: "step", s: "Watch your step on the stairs." },
        { w: "spin", s: "Watch the top spin around." },
        { w: "swim", s: "I can swim in the pool." },
        { w: "frog", s: "The green frog can hop." },
        { w: "drum", s: "I can bang on the drum." },
        { w: "clap", s: "Let's clap our hands." },
        { w: "flag", s: "The flag is red and white." },
        { w: "grab", s: "Grab your bag and let's go." },
        { w: "plan", s: "We made a fun plan." },
        { w: "slip", s: "Be careful, don't slip!" },
        { w: "trip", s: "We went on a long trip." },
        { w: "crab", s: "The crab walked on the sand." },
        { w: "glad", s: "I am glad to see you." },
        { w: "sled", s: "We rode the sled down the hill." },
        { w: "snap", s: "I can snap my fingers." }
      ]
    },
    {
      id: "blue", name: "Blue Belt", emoji: "🟦", color: "#4aa3ff",
      blurb: "Magic 'e' makes the vowel say its name!",
      words: [
        { w: "cake", s: "We baked a yummy cake." },
        { w: "name", s: "Please write your name." },
        { w: "game", s: "Let's play a fun game." },
        { w: "bike", s: "I can ride my new bike." },
        { w: "kite", s: "The kite flew up high." },
        { w: "time", s: "It is time for lunch." },
        { w: "nose", s: "A bee landed on my nose." },
        { w: "home", s: "We walked back home." },
        { w: "bone", s: "The dog chewed a big bone." },
        { w: "cute", s: "The puppy is so cute." },
        { w: "rope", s: "We can skip with the rope." },
        { w: "hope", s: "I hope it is sunny tomorrow." },
        { w: "late", s: "Don't be late for school." },
        { w: "gate", s: "Please close the gate." },
        { w: "ride", s: "Let's go for a ride." },
        { w: "five", s: "I have five fingers on one hand." }
      ]
    },
    {
      id: "purple", name: "Purple Belt", emoji: "🟪", color: "#a96bff",
      blurb: "Two vowels go walking: vowel teams.",
      words: [
        { w: "rain", s: "The rain made big puddles." },
        { w: "train", s: "The train went down the track." },
        { w: "play", s: "Let's go out and play." },
        { w: "day", s: "It is a beautiful day." },
        { w: "tree", s: "A bird sat in the tree." },
        { w: "green", s: "The grass is bright green." },
        { w: "boat", s: "The boat floated on the lake." },
        { w: "road", s: "We drove down the long road." },
        { w: "coat", s: "Wear your warm coat outside." },
        { w: "snow", s: "The snow is cold and white." },
        { w: "feet", s: "I have two feet." },
        { w: "meet", s: "Let's meet at the park." },
        { w: "leaf", s: "A red leaf fell from the tree." },
        { w: "seed", s: "We planted a tiny seed." },
        { w: "moon", s: "The moon is bright tonight." },
        { w: "rainbow", s: "I saw a rainbow after the rain." }
      ]
    },
    {
      id: "brown", name: "Brown Belt", emoji: "🟫", color: "#b5793f",
      blurb: "The bossy 'r' words.",
      words: [
        { w: "car", s: "We drove the car to town." },
        { w: "star", s: "I see a star in the sky." },
        { w: "far", s: "The store is not far away." },
        { w: "for", s: "This gift is for you." },
        { w: "corn", s: "I like to eat sweet corn." },
        { w: "born", s: "The baby was just born." },
        { w: "her", s: "I gave her a hug." },
        { w: "bird", s: "The bird sang a sweet song." },
        { w: "girl", s: "The girl rode her bike." },
        { w: "turn", s: "It is my turn to play." },
        { w: "hurt", s: "I did not get hurt." },
        { w: "park", s: "We played at the park." },
        { w: "dark", s: "It gets dark at night." },
        { w: "fork", s: "I eat with a fork." },
        { w: "horn", s: "The car has a loud horn." },
        { w: "first", s: "I came in first place!" }
      ]
    },
    {
      id: "red", name: "Red Belt", emoji: "🟥", color: "#ff5a5a",
      blurb: "Big-kid words you use all the time.",
      words: [
        { w: "friend", s: "My friend came to play." },
        { w: "because", s: "I smiled because I was happy." },
        { w: "people", s: "Many people came to the fair." },
        { w: "little", s: "The little kitten is soft." },
        { w: "again", s: "Let's read it again." },
        { w: "water", s: "I drink lots of water." },
        { w: "mother", s: "My mother makes great soup." },
        { w: "father", s: "My father reads to me." },
        { w: "sister", s: "My sister is funny." },
        { w: "school", s: "I walk to school each day." },
        { w: "please", s: "May I please have more?" },
        { w: "would", s: "Would you like to play?" },
        { w: "could", s: "I could jump very high." },
        { w: "should", s: "We should clean up now." },
        { w: "pretty", s: "The flower is so pretty." },
        { w: "before", s: "Wash your hands before you eat." }
      ]
    },
    {
      id: "black", name: "Black Belt", emoji: "⬛", color: "#3a3a4a",
      blurb: "Tricky champion words. True Canadian spelling!",
      words: [
        { w: "colour", s: "Blue is my favourite colour." },
        { w: "favourite", s: "Pizza is my favourite food." },
        { w: "neighbour", s: "Our neighbour has a friendly dog." },
        { w: "centre", s: "We met in the centre of town." },
        { w: "every", s: "I brush my teeth every day." },
        { w: "special", s: "Today is a special day." },
        { w: "beautiful", s: "The sunset is beautiful." },
        { w: "different", s: "We picked two different books." },
        { w: "sentence", s: "I can write a whole sentence." },
        { w: "morning", s: "Good morning, sunshine!" },
        { w: "another", s: "May I have another turn?" },
        { w: "together", s: "We sang a song together." },
        { w: "important", s: "Sleep is important for you." },
        { w: "remember", s: "I remember your birthday." },
        { w: "surprise", s: "We made a surprise for Mom." },
        { w: "favour", s: "Can you do me a favour?" }
      ]
    }
  ];

  /* ---- Eddie: tiny decodable words (tap the letters) ------------------- */
  // Two tiers: words he already KNOWS, then simple CVC words to sound out.
  const eddieWords = [
    // Words Eddie already knows — confidence first!
    { w: "no",   s: "No means stop and do not.", known: true },
    { w: "on",   s: "The light is on.", known: true },
    { w: "off",  s: "Turn the light off.", known: true },
    { w: "stop", s: "Stop at the red light.", known: true },
    { w: "back", s: "Come back here, please.", known: true },
    // CVC words to sound out: c-a-t
    { w: "cat", s: "The cat says meow." },
    { w: "dog", s: "The dog says woof." },
    { w: "sun", s: "The sun is hot." },
    { w: "hat", s: "I wear a hat." },
    { w: "pig", s: "The pig says oink." },
    { w: "bed", s: "I sleep in bed." },
    { w: "cup", s: "I drink from a cup." },
    { w: "pen", s: "I write with a pen." },
    { w: "bus", s: "The bus is big." },
    { w: "bug", s: "The bug is small." },
    { w: "cap", s: "Put on your cap." },
    { w: "mat", s: "Wipe your feet on the mat." },
    { w: "hen", s: "The hen says cluck." },
    { w: "fox", s: "The fox is red." },
    { w: "pot", s: "The soup is in the pot." },
    { w: "fan", s: "The fan keeps me cool." },
    { w: "van", s: "We ride in the van." },
    { w: "web", s: "A spider made a web." },
    { w: "zip", s: "Zip up your coat." },
    { w: "rug", s: "The cat sat on the rug." },
    { w: "ten", s: "I have ten toes." },
    { w: "six", s: "I am almost six." },
    { w: "box", s: "The toy is in the box." },
    { w: "jam", s: "I like jam." },
    { w: "log", s: "A frog sat on a log." }
  ];

  SB.WORDS = {
    alice: { belts: aliceBelts },
    eddie: { words: eddieWords }
  };

  // Words that sound like another word. For these we ALWAYS play the sentence
  // first, because the bare spoken word is ambiguous (e.g. "for" vs "four",
  // "here" vs "hear", "no" vs "know"). Without context they can't be marked
  // right or wrong fairly.
  SB.HOMOPHONES = new Set([
    "no", "for", "here", "there", "your", "would", "see", "meet", "sun",
    "be", "by", "road", "rain", "won", "two", "to", "blue", "hear", "where"
  ]);

  // Flat helper: total Alice words
  SB.totalAliceWords = aliceBelts.reduce((n, b) => n + b.words.length, 0);
})();
