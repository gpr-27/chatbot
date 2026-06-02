// Thin API client for Groqbot. The backend base URL comes from the central
// config (config.apiUrl); every request URL is built from it.

import { config } from "../config/index.js";

const JSON_HEADERS = { "Content-Type": "application/json" };

/** Build an absolute request URL from a path against the configured API base. */
function apiUrl(path) {
  return `${config.apiUrl}${path}`;
}

/* ---- Auth-header bridge ----------------------------------- */
// AuthProvider wires in a getter that returns the right auth headers for the
// active session — Clerk { Authorization: "Bearer <jwt>" } or guest
// { "X-Guest-Id": "guest_<uuid>" }. Every request attaches them.
let headersGetter = null;
export function setAuthHeadersGetter(fn) {
  headersGetter = fn;
}
async function authHeader() {
  if (!headersGetter) return {};
  try {
    return (await headersGetter()) || {};
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}), ...(await authHeader()) };
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers,
  });

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message = data?.message || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

/* ---- Chat ------------------------------------------------- */
export const chatApi = {
  status: () => request("/api/chat/ai-status"),
  models: () => request("/api/chat/models"),
  sessions: () => request("/api/chat/sessions"),
  history: (sessionId) => request(`/api/chat/history/${sessionId}`),
  rename: (sessionId, title) =>
    request(`/api/chat/session/${sessionId}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ title }),
    }),
  remove: (sessionId) =>
    request(`/api/chat/session/${sessionId}`, { method: "DELETE" }),
  clearAll: () => request("/api/chat/clear-all", { method: "DELETE" }),
};

/**
 * Stream an assistant reply via SSE-over-fetch.
 * Calls onMeta(data) once, onToken(text) per chunk, onDone(data) at the end,
 * and onError(message) on failure. Pass an AbortSignal to stop generation.
 */
export async function streamMessage(
  { message, sessionId, model, regenerate },
  { signal, onMeta, onToken, onDone, onError } = {}
) {
  let res;
  try {
    res = await fetch(apiUrl("/api/chat/message/stream"), {
      method: "POST",
      headers: { ...JSON_HEADERS, ...(await authHeader()) },
      credentials: "include",
      body: JSON.stringify({ message, sessionId, model, regenerate }),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") return;
    onError?.("Network error — could not reach the server.");
    return;
  }

  if (!res.ok || !res.body) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {
      /* ignore */
    }
    onError?.(msg);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        if (!frame.trim()) continue;
        let event = "message";
        let dataStr = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim();
          else if (line.startsWith("data:")) dataStr += line.slice(5).trim();
        }
        if (!dataStr) continue;
        let payload;
        try {
          payload = JSON.parse(dataStr);
        } catch {
          continue;
        }
        if (event === "meta") onMeta?.(payload);
        else if (event === "token") onToken?.(payload.token ?? "");
        else if (event === "done") onDone?.(payload);
        else if (event === "error") onError?.(payload.message || "Stream error");
      }
    }
  } catch (err) {
    if (err.name === "AbortError") return; // user stopped — not an error
    onError?.("Connection interrupted.");
  }
}
