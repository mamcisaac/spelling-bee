/* ===========================================================================
   words.js — Word lists for the Spelling Bee game
   ---------------------------------------------------------------------------
   Alice — 8 yrs, Grade 2, Canada. A real spelling drill (types or says the
           word). Canadian spellings (colour, favourite, neighbour…). Organised
           into "belts" by spelling pattern, the way Grade-2 lists usually are.
           Every word has a kid-friendly sentence — the game ALWAYS introduces a
           word inside its sentence ("Your word is 'between'. As in, sit between
           your two friends.").
   Eddie — 4 yrs, pre-reader. Builds short decodable words by tapping tiles.

   Each entry: { w: "word", s: "A sentence using the word." }
   =========================================================================== */
(function () {
  "use strict";
  window.SB = window.SB || {};

  /* ---- Alice: Grade-2 belts, by spelling pattern ---------------------- */
  const aliceBelts = [
    {
      id: "white", name: "White Belt", emoji: "⬜", color: "#f4f4f8",
      blurb: "Short vowel words. A warm-up!",
      words: [
        { w: "hand", s: "Raise your hand to answer." },
        { w: "jump", s: "I can jump over the puddle." },
        { w: "milk", s: "I drink milk with my lunch." },
        { w: "fast", s: "The cheetah runs very fast." },
        { w: "last", s: "She was last in line." },
        { w: "soft", s: "The kitten has soft fur." },
        { w: "nest", s: "The bird built a nest." },
        { w: "gift", s: "I wrapped a gift for you." },
        { w: "lamp", s: "Turn on the lamp to read." },
        { w: "desk", s: "My books are on my desk." },
        { w: "pond", s: "The ducks swim in the pond." },
        { w: "wind", s: "The wind blew my hat away." },
        { w: "sand", s: "We built a castle in the sand." },
        { w: "best", s: "You did your very best." }
      ]
    },
    {
      id: "yellow", name: "Yellow Belt", emoji: "🟨", color: "#ffe44d",
      blurb: "Tricky words we use every day.",
      words: [
        { w: "said", s: "She said hello to me." },
        { w: "again", s: "Let's try it again." },
        { w: "because", s: "I smiled because I was happy." },
        { w: "friend", s: "My best friend is very kind." },
        { w: "people", s: "Many people came to the show." },
        { w: "before", s: "Wash your hands before lunch." },
        { w: "around", s: "We walked around the park." },
        { w: "about", s: "This book is about space." },
        { w: "would", s: "Would you like a snack?" },
        { w: "could", s: "I could hear the birds singing." },
        { w: "should", s: "We should share our toys." },
        { w: "every", s: "I read every single night." },
        { w: "pretty", s: "The garden is so pretty." },
        { w: "school", s: "I walk to school each day." }
      ]
    },
    {
      id: "orange", name: "Orange Belt", emoji: "🟧", color: "#ff9f3a",
      blurb: "Two letters, one sound: sh, ch, th, wh.",
      words: [
        { w: "which", s: "Which one do you want?" },
        { w: "while", s: "Please read while I cook." },
        { w: "these", s: "I really like these shoes." },
        { w: "those", s: "Those are my warm mittens." },
        { w: "third", s: "She came in third place." },
        { w: "teeth", s: "I brush my teeth every morning." },
        { w: "tooth", s: "I lost a wobbly tooth." },
        { w: "chair", s: "Please pull up a chair." },
        { w: "cheese", s: "I like cheese on my toast." },
        { w: "brush", s: "Brush your hair before school." },
        { w: "fresh", s: "The bread smells fresh." },
        { w: "shadow", s: "I saw my shadow on the wall." },
        { w: "weather", s: "The weather is sunny today." },
        { w: "north", s: "We drove north to the lake." }
      ]
    },
    {
      id: "green", name: "Green Belt", emoji: "🟩", color: "#5ad17a",
      blurb: "Letters that blend together.",
      words: [
        { w: "street", s: "We live on a quiet street." },
        { w: "spring", s: "Flowers bloom in the spring." },
        { w: "strong", s: "An ox is very strong." },
        { w: "splash", s: "Don't splash in the bathtub." },
        { w: "plant", s: "We will plant a little seed." },
        { w: "branch", s: "A bird sat on the branch." },
        { w: "ground", s: "The ball fell to the ground." },
        { w: "present", s: "I got a birthday present." },
        { w: "problem", s: "We solved the problem together." },
        { w: "crunch", s: "I love the crunch of an apple." },
        { w: "blank", s: "Fill in the blank space." },
        { w: "twist", s: "Twist the lid to open it." },
        { w: "frost", s: "There was frost on the grass." },
        { w: "sprint", s: "I sprint to the finish line." }
      ]
    },
    {
      id: "blue", name: "Blue Belt", emoji: "🟦", color: "#4aa3ff",
      blurb: "Magic 'e' makes the vowel say its name.",
      words: [
        { w: "place", s: "This is a quiet place to read." },
        { w: "space", s: "There is space for one more." },
        { w: "plane", s: "The plane flew up high." },
        { w: "grade", s: "I am in grade two." },
        { w: "write", s: "I can write my own name." },
        { w: "drive", s: "Dad will drive us home." },
        { w: "smile", s: "You have a lovely smile." },
        { w: "prize", s: "She won first prize." },
        { w: "brave", s: "The brave dog barked loudly." },
        { w: "shape", s: "A circle is a round shape." },
        { w: "slide", s: "Let's go down the slide." },
        { w: "stone", s: "I found a smooth stone." },
        { w: "flame", s: "The candle has a tiny flame." },
        { w: "escape", s: "The bunny tried to escape." }
      ]
    },
    {
      id: "purple", name: "Purple Belt", emoji: "🟪", color: "#a96bff",
      blurb: "Two vowels go walking: vowel teams.",
      words: [
        { w: "between", s: "Sit between your two friends." },
        { w: "dream", s: "I had a happy dream last night." },
        { w: "clean", s: "Please clean your bedroom." },
        { w: "please", s: "May I please go outside?" },
        { w: "leave", s: "We leave for the trip at noon." },
        { w: "teacher", s: "My teacher is really funny." },
        { w: "reach", s: "I can reach the top shelf." },
        { w: "beach", s: "We built sandcastles at the beach." },
        { w: "float", s: "The little boat will float." },
        { w: "follow", s: "Follow me to the door." },
        { w: "yellow", s: "The sun is bright yellow." },
        { w: "window", s: "Open the window for fresh air." },
        { w: "sleep", s: "I sleep for ten hours." },
        { w: "green", s: "The leaves are green in summer." }
      ]
    },
    {
      id: "brown", name: "Brown Belt", emoji: "🟫", color: "#b5793f",
      blurb: "The bossy 'r', and words ending in -er.",
      words: [
        { w: "under", s: "The cat hid under the bed." },
        { w: "water", s: "I drink lots of water." },
        { w: "sister", s: "My sister is older than me." },
        { w: "brother", s: "My brother is very funny." },
        { w: "after", s: "We play outside after school." },
        { w: "never", s: "I never give up." },
        { w: "river", s: "We fished in the river." },
        { w: "dinner", s: "We eat dinner at six o'clock." },
        { w: "winter", s: "It snows a lot in winter." },
        { w: "party", s: "We had a birthday party." },
        { w: "story", s: "Read me a bedtime story." },
        { w: "world", s: "The world is a big place." },
        { w: "learn", s: "I want to learn to swim." },
        { w: "garden", s: "We grow carrots in the garden." }
      ]
    },
    {
      id: "red", name: "Red Belt", emoji: "🟥", color: "#ff5a5a",
      blurb: "Noisy vowels: oi, oy, ou, ow.",
      words: [
        { w: "moist", s: "The chocolate cake is soft and moist." },
        { w: "point", s: "Point to the right answer." },
        { w: "join", s: "Come and join the game." },
        { w: "coin", s: "I found a shiny coin." },
        { w: "soil", s: "Plants grow in good soil." },
        { w: "voice", s: "Please use your inside voice." },
        { w: "noise", s: "The truck made a loud noise." },
        { w: "enjoy", s: "I really enjoy painting." },
        { w: "found", s: "I found my lost shoe." },
        { w: "round", s: "The wheel is perfectly round." },
        { w: "town", s: "We drove into town." },
        { w: "brown", s: "The bear has thick brown fur." },
        { w: "crown", s: "The queen wears a gold crown." },
        { w: "flower", s: "I picked a yellow flower." }
      ]
    },
    {
      id: "black", name: "Black Belt", emoji: "⬛", color: "#3a3a4a",
      blurb: "Champion words — true Canadian spelling!",
      words: [
        { w: "favourite", s: "Pizza is my favourite food." },
        { w: "colour", s: "Blue is my favourite colour." },
        { w: "neighbour", s: "Our neighbour waved hello." },
        { w: "beautiful", s: "The sunset is so beautiful." },
        { w: "different", s: "We chose two different books." },
        { w: "important", s: "Sleep is important for you." },
        { w: "remember", s: "I remember your birthday." },
        { w: "together", s: "We sang a song together." },
        { w: "another", s: "May I have another turn?" },
        { w: "finally", s: "We finally finished the puzzle." },
        { w: "animal", s: "A dog is my favourite animal." },
        { w: "family", s: "My family loves board games." },
        { w: "morning", s: "Good morning, sunshine!" },
        { w: "suddenly", s: "Suddenly, it started to rain." }
      ]
    }
  ];

  /* ---- Eddie: tiny decodable words (tap the letters) ------------------- */
  const eddieWords = [
    { w: "no",   s: "No means stop and do not.", known: true },
    { w: "on",   s: "The light is on.", known: true },
    { w: "off",  s: "Turn the light off.", known: true },
    { w: "stop", s: "We stop at the red light.", known: true },
    { w: "back", s: "Come back here, please.", known: true },
    { w: "cat", s: "The cat says meow." },
    { w: "dog", s: "The dog says woof." },
    { w: "sun", s: "The sun is bright and hot." },
    { w: "hat", s: "I wear a hat on my head." },
    { w: "pig", s: "The pig says oink." },
    { w: "bed", s: "I sleep in my bed." },
    { w: "cup", s: "I drink from a cup." },
    { w: "pen", s: "I write with a pen." },
    { w: "bus", s: "The bus is big and yellow." },
    { w: "bug", s: "The bug is very small." },
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
    { w: "six", s: "I am almost six years old." },
    { w: "box", s: "The toy is in the box." },
    { w: "jam", s: "I like jam on my toast." },
    { w: "log", s: "A frog sat on a log." }
  ];

  SB.WORDS = {
    alice: { belts: aliceBelts },
    eddie: { words: eddieWords }
  };

  // Every word is now always read inside its sentence, so context is always
  // present. This set is kept only so the "say it again" prompt can lean extra
  // hard on the sentence for the most confusable look-alikes.
  SB.HOMOPHONES = new Set([
    "no", "sun", "write", "plane", "flower", "which", "would",
    "for", "four", "here", "hear", "there", "your", "see", "sea",
    "to", "two", "too", "by", "buy", "road", "rode", "one", "won",
    "blue", "know", "son", "right", "plain", "flour", "witch", "wood"
  ]);

  SB.totalAliceWords = aliceBelts.reduce((n, b) => n + b.words.length, 0);
})();
