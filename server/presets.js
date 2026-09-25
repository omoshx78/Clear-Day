export const PRESETS = {
  smoking: {
    id: "smoking",
    label: "Smoking",
    unit: "cigarette",
    breathingPrompt: "Cravings for a cigarette peak in about 3-5 minutes. Let's ride it out together.",
  },
  alcohol: {
    id: "alcohol",
    label: "Alcohol",
    unit: "drink",
    breathingPrompt: "The urge to drink will pass. Focus on your breath — you are stronger than this moment.",
  },
  gambling: {
    id: "gambling",
    label: "Gambling / Betting",
    unit: "bet",
    breathingPrompt: "The odds never favor the urge. Pause, breathe, and remember why you started this journey.",
  },
};

export function calcStreak(quitDateISO) {
  const quitDate = new Date(quitDateISO);
  const now = new Date();
  const ms = now.setHours(0, 0, 0, 0) - new Date(quitDate).setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(ms / 86400000));
}

export function calcMoneySaved(quitDateISO, weeklySpend) {
  const days = calcStreak(quitDateISO);
  const dailySpend = (Number(weeklySpend) || 0) / 7;
  return Math.round(dailySpend * days * 100) / 100;
}
