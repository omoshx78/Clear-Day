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

  requestOtp: (phone) => request("/api/auth/request-otp", { method: "POST", body: JSON.stringify({ phone }) }),
  verifyOtp: (phone, code) => request("/api/auth/verify-otp", { method: "POST", body: JSON.stringify({ phone, code }) }),

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
  startProCheckout: () => request("/api/pro/checkout", { method: "POST" }),
  pollCheckout: (checkoutRequestId) => request(`/api/pro/checkout/${checkoutRequestId}`),
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
};
