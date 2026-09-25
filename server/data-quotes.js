export const QUOTES = {
  smoking: [
    { text: "Every cigarette you don't smoke is a fight you already won today.", tone: "tough" },
    { text: "Your lungs are healing right now, even while you read this.", tone: "gentle" },
    { text: "The craving is loud, but it's temporary. You've outlasted it before.", tone: "gentle" },
    { text: "You didn't come this far to only come this far.", tone: "tough" },
    { text: "Breathe in clean air. That's the whole point.", tone: "gentle" },
  ],
  alcohol: [
    { text: "A clear morning tomorrow starts with the choice you make tonight.", tone: "gentle" },
    { text: "You are not missing out. You are getting yourself back.", tone: "gentle" },
    { text: "The urge will pass whether you drink or not. Let it pass.", tone: "tough" },
    { text: "One more sober day compounds. Trust the process.", tone: "tough" },
    { text: "Your future self is grateful for what you're choosing right now.", tone: "gentle" },
  ],
  gambling: [
    { text: "The house always wins eventually. Walking away is how you win first.", tone: "tough" },
    { text: "Every shilling you don't stake is a shilling that stays yours.", tone: "tough" },
    { text: "You are not chasing a loss. You are building a future.", tone: "gentle" },
    { text: "The app, the odds, the next bet — none of it needs you today.", tone: "gentle" },
    { text: "Real control feels quiet, not exciting. Choose quiet.", tone: "tough" },
  ],
};

// Random pick that avoids repeating the same quote twice in a row (pass the
// text of whatever was last shown to this user, if known).
export function randomQuote(addiction, excludeText) {
  const list = QUOTES[addiction] || QUOTES.smoking;
  const pool = list.length > 1 && excludeText ? list.filter((q) => q.text !== excludeText) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}
