export const PRO_PLAN = {
  priceKes: 199,
  periodDays: 30,
  label: "ClearDay Pro",
  features: [
    "1:1 messaging with verified support providers",
    "Advanced craving analytics & downloadable progress report",
    "Personalized relapse-prevention plan",
    "Full guided meditation & audio library",
    "Ad-free",
    "Unlimited journal history & cloud backup",
  ],
};

export function isProActive(user) {
  return Boolean(user.isPro && user.proExpiresAt && new Date(user.proExpiresAt) > new Date());
}
