const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";
const SECRET_KEY = "clearday_admin_secret";

export function getAdminSecret() {
  return localStorage.getItem(SECRET_KEY);
}

export function setAdminSecret(secret) {
  localStorage.setItem(SECRET_KEY, secret);
}

export function clearAdminSecret() {
  localStorage.removeItem(SECRET_KEY);
}

async function request(path, options = {}) {
  const secret = getAdminSecret();
  const headers = { "Content-Type": "application/json", "x-admin-secret": secret || "" };
  const res = await fetch(`${API_URL}${path}`, { headers, ...options });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const adminApi = {
  getStats: () => request("/api/admin/stats"),
  getUsers: () => request("/api/admin/users"),
  getPendingProviders: () => request("/api/admin/providers/pending"),
  verifyProvider: (id) => request(`/api/admin/providers/${id}/verify`, { method: "POST" }),
  rejectProvider: (id) => request(`/api/admin/providers/${id}/reject`, { method: "POST" }),
  getPendingInstitutions: () => request("/api/admin/institutions/pending"),
  verifyInstitution: (id) => request(`/api/admin/institutions/${id}/verify`, { method: "POST" }),
};
