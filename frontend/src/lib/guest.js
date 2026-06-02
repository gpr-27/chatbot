// Anonymous guest session helpers — talks to /api/auth/guest and persists the
// guest id in localStorage so the session survives reloads.

import { config } from "../config/index.js";

const GUEST_KEY = "groqbot-guest-id";

export const getStoredGuestId = () => localStorage.getItem(GUEST_KEY) || null;
export const storeGuestId = (id) => localStorage.setItem(GUEST_KEY, id);
export const clearGuestId = () => localStorage.removeItem(GUEST_KEY);

async function guestRequest(path, { method = "GET", headers = {} } = {}) {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

/** Create a brand-new anonymous guest. */
export const createGuest = () => guestRequest("/api/auth/guest", { method: "POST" });

/** Restore an existing guest by its stored id. */
export const restoreGuest = (guestId) =>
  guestRequest("/api/auth/guest", { headers: { "X-Guest-Id": guestId } });
