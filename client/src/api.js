const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("quitapp_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { headers, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  getPresets: () => request("/api/presets"),
  getCrisisResources: () => request("/api/crisis-resources"),

  checkPhone: (phone) => request(`/api/auth/check-phone?phone=${encodeURIComponent(phone)}`),
  register: (phone, pin, ageConfirmed) => request("/api/auth/register", { method: "POST", body: JSON.stringify({ phone, pin, ageConfirmed }) }),
  login: (phone, pin) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ phone, pin }) }),

  completeProfile: (data) => request("/api/users/me/profile", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/api/users/me"),
  relapse: () => request("/api/users/me/relapse", { method: "POST" }),

  checkin: (data) => request("/api/checkins", { method: "POST", body: JSON.stringify(data) }),
  getCheckins: () => request("/api/checkins/me"),

  addJournal: (data) => request("/api/journal", { method: "POST", body: JSON.stringify(data) }),
  getJournal: () => request("/api/journal/me"),

  getDailyQuote: () => request("/api/quotes/daily"),
  getRandomQuote: () => request("/api/quotes/random"),

  getHobbies: () => request("/api/hobbies"),

  getProPlan: () => request("/api/pro/plan"),
  getProStatus: () => request("/api/pro/status"),
  startProCheckout: (mpesaPhone) => request("/api/pro/checkout", { method: "POST", body: JSON.stringify({ mpesaPhone }) }),
  pollCheckout: (checkoutRequestId) => request(`/api/pro/checkout/${checkoutRequestId}`),

  getFlutterwaveInfo: () => request("/api/pro/flutterwave/info"),
  startFlutterwaveCheckout: () => request("/api/pro/flutterwave/checkout", { method: "POST" }),
  verifyFlutterwavePayment: (transactionId, txRef) =>
    request(`/api/pro/flutterwave/verify?transaction_id=${encodeURIComponent(transactionId)}&tx_ref=${encodeURIComponent(txRef)}`),
  getAnalytics: () => request("/api/analytics"),

  getProviderSpecialties: () => request("/api/providers/specialties"),
  applyAsProvider: (data) => request("/api/providers/apply", { method: "POST", body: JSON.stringify(data) }),
  getProviders: (specialty) => request(`/api/providers${specialty ? `?specialty=${encodeURIComponent(specialty)}` : ""}`),
  getProvider: (id) => request(`/api/providers/${id}`),
  getMyConversations: () => request("/api/providers/me/conversations"),

  getInstitutionTypes: () => request("/api/institutions/types"),
  applyInstitution: (data) => request("/api/institutions/apply", { method: "POST", body: JSON.stringify(data) }),
  getMyInstitution: () => request("/api/institutions/me"),
  getInstitutionDashboard: () => request("/api/institutions/me/dashboard"),
  joinInstitution: (inviteCode) => request("/api/institutions/join", { method: "POST", body: JSON.stringify({ inviteCode }) }),

  sendMessage: (toUserId, text) => request("/api/messages", { method: "POST", body: JSON.stringify({ toUserId, text }) }),
  getThread: (otherUserId) => request(`/api/messages/${otherUserId}`),

  setReminders: (enabled, time) => request("/api/users/me/reminders", { method: "POST", body: JSON.stringify({ enabled, time }) }),

  sendFeedback: (category, message) => request("/api/feedback", { method: "POST", body: JSON.stringify({ category, message }) }),

  getPlaceCategories: () => request("/api/places/categories"),
  getNearbyPlaces: (category, lat, lon, radius) => request(`/api/places/nearby?category=${category}&lat=${lat}&lon=${lon}&radius=${radius || 5000}`),
  geocodePlace: (q) => request(`/api/places/geocode?q=${encodeURIComponent(q)}`),

  forgotPin: (phone) => request("/api/auth/forgot-pin", { method: "POST", body: JSON.stringify({ phone }) }),
  resetPin: (phone, code, newPin) => request("/api/auth/reset-pin", { method: "POST", body: JSON.stringify({ phone, code, newPin }) }),
  changePin: (currentPin, newPin) => request("/api/users/me/change-pin", { method: "POST", body: JSON.stringify({ currentPin, newPin }) }),
  setRecoveryEmail: (email) => request("/api/users/me/recovery-email", { method: "POST", body: JSON.stringify({ email }) }),
  exportMyData: () => request("/api/users/me/export"),
  deleteMyAccount: () => request("/api/users/me", { method: "DELETE" }),
};
