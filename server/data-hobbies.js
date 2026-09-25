export const HOBBIES = {
  smoking: [
    "Take up cooking or trying a new recipe each week",
    "Start drawing or sketching — keeps hands busy",
    "Join a local football or running group",
    "Try gardening, even a few pots on a balcony",
    "Learn an instrument — guitar or keyboard basics",
  ],
  alcohol: [
    "Join a gym class or morning workout group",
    "Find alcohol-free social spots — coffee meetups work well",
    "Volunteer for a cause you care about",
    "Start journaling most evenings instead",
    "Join a church, mosque, or community group activity",
  ],
  gambling: [
    "Try chess — same thrill of strategy, no money at risk",
    "Join a savings group (chama) — a different kind of stake",
    "Play video games with friends instead of betting apps",
    "Try a fantasy sports league with no money involved",
    "Take on a new skill course — coding, design, a trade",
  ],
};

// ISO week number, used to rotate suggestions weekly without needing user state
function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

export function weeklyHobbies(addiction, count = 3) {
  const list = HOBBIES[addiction] || HOBBIES.smoking;
  const week = isoWeek();
  const start = week % list.length;
  const picks = [];
  for (let i = 0; i < count && i < list.length; i++) {
    picks.push(list[(start + i) % list.length]);
  }
  return picks;
}
