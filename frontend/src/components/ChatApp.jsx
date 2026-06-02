import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi, streamMessage } from "../lib/api";
import { config } from "../config";
import { useAppAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Sidebar from "./Sidebar";
import ChatView from "./ChatView";
import ConfirmDialog from "./ConfirmDialog";
import "../styles/chat.css";

const MODEL_KEY = "groqbot-model";
const COLLAPSE_KEY = "groqbot-sidebar-collapsed";

export default function ChatApp() {
  const { success, error: toastError } = useToast();

  // Unified user — a Clerk account or an anonymous guest. The auth-header bridge
  // for the API client is registered in AuthProvider, so there's nothing to wire
  // up here; both kinds of session "just work".
  const { user, isGuest, signOut } = useAppAuth();

  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  // The model picker is populated from the central config (VITE_AVAILABLE_MODELS),
  // not from the backend list.
  const [models] = useState(config.models);
  const [selectedModel, setSelectedModel] = useState(
    () => localStorage.getItem(MODEL_KEY) || config.defaultModel
  );

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(COLLAPSE_KEY) === "1"
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dialog, setDialog] = useState(null); // { type, session? }

  const abortRef = useRef(null);
  const bufferRef = useRef("");
  const rafRef = useRef(null);
  const sessionRef = useRef(null); // latest session id for async callbacks
  const genRef = useRef(0); // identifies the active stream; stale callbacks bail

  /* ---- bootstrap ---- */
  const loadSessions = useCallback(async () => {
    try {
      const res = await chatApi.sessions();
      setSessions(res.data.sessions);
    } catch {
      /* non-fatal */
    }
  }, []);

  // Fetch live AI status (drives the "Groq · live" vs "Basic mode" badge).
  // Retries a couple of times so a transient first-load failure doesn't strand
  // the UI in Basic mode until a manual reload.
  const loadStatus = useCallback(async (retries = 2) => {
    try {
      const res = await chatApi.status();
      setAiStatus(res.data);
    } catch {
      if (retries > 0) setTimeout(() => loadStatus(retries - 1), 1500);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    // Validate the persisted model against the configured list; fall back to
    // the configured default if it's no longer offered.
    setSelectedModel((cur) =>
      config.models.some((m) => m.id === cur) ? cur : config.defaultModel
    );
    // The model list comes from config; only the live status comes from the API.
    loadStatus();
  }, [loadSessions, loadStatus]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem(MODEL_KEY, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  /* ---- keyboard: ⌘K / Ctrl+K new chat ---- */
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        startNewChat();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- streaming helpers ---- */
  const flush = useCallback(() => {
    rafRef.current = null;
    setMessages((prev) => {
      const next = [...prev];
      const i = next.length - 1;
      if (i >= 0 && next[i].sender === "bot") {
        next[i] = { ...next[i], content: bufferRef.current };
      }
      return next;
    });
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(flush);
  }, [flush]);

  // Invalidate the in-flight stream so its async callbacks no-op, and clear
  // all transient stream state. Used when switching/clearing/stopping.
  const cancelActiveStream = useCallback(() => {
    genRef.current++;
    abortRef.current?.abort();
    abortRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    bufferRef.current = "";
  }, []);

  const runStream = useCallback(
    async (payload) => {
      const myGen = ++genRef.current; // this stream owns this generation
      const controller = new AbortController();
      abortRef.current = controller;
      bufferRef.current = "";
      setStreaming(true);

      const isStale = () => genRef.current !== myGen;

      await streamMessage(payload, {
        signal: controller.signal,
        onMeta: (data) => {
          if (isStale()) return;
          if (data.sessionId) {
            sessionRef.current = data.sessionId;
            setCurrentSessionId(data.sessionId);
          }
        },
        onToken: (tok) => {
          if (isStale()) return;
          bufferRef.current += tok;
          scheduleFlush();
        },
        onDone: (data) => {
          if (isStale()) return;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          flush();
          if (data?.aiStatus) setAiStatus(data.aiStatus);
          loadSessions();
        },
        onError: (msg) => {
          if (isStale()) return;
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          flush();
          toastError(msg || "Something went wrong");
          // Drop an empty bot placeholder if nothing streamed
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.sender === "bot" && !last.content) return prev.slice(0, -1);
            return prev;
          });
        },
      });

      // Only tear down if a newer action hasn't superseded this stream.
      if (genRef.current === myGen) {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [flush, scheduleFlush, loadSessions, toastError]
  );

  /* ---- actions ---- */
  const sendMessage = useCallback(
    (text) => {
      if (streaming) return;
      const sid = sessionRef.current;
      setMessages((prev) => [
        ...prev,
        { content: text, sender: "user", timestamp: new Date().toISOString() },
        { content: "", sender: "bot", timestamp: new Date().toISOString() },
      ]);
      runStream({ message: text, sessionId: sid, model: selectedModel });
    },
    [streaming, selectedModel, runStream]
  );

  const regenerate = useCallback(() => {
    if (streaming || !sessionRef.current) return;
    setMessages((prev) => {
      const next = [...prev];
      // remove trailing bot message, add a fresh placeholder
      if (next.length && next[next.length - 1].sender === "bot") next.pop();
      next.push({ content: "", sender: "bot", timestamp: new Date().toISOString() });
      return next;
    });
    runStream({ sessionId: sessionRef.current, model: selectedModel, regenerate: true });
  }, [streaming, selectedModel, runStream]);

  const stopGenerating = useCallback(() => {
    flush(); // commit whatever streamed so far, then invalidate the stream
    cancelActiveStream();
    setStreaming(false);
  }, [flush, cancelActiveStream]);

  const startNewChat = useCallback(() => {
    cancelActiveStream();
    sessionRef.current = null;
    setCurrentSessionId(null);
    setMessages([]);
    setStreaming(false);
    setMobileOpen(false);
  }, [cancelActiveStream]);

  const selectSession = useCallback(
    async (sessionId) => {
      if (sessionId === currentSessionId) {
        setMobileOpen(false);
        return;
      }
      cancelActiveStream();
      setStreaming(false);
      sessionRef.current = sessionId;
      setCurrentSessionId(sessionId);
      setMobileOpen(false);
      try {
        const res = await chatApi.history(sessionId);
        setMessages(res.data.messages);
      } catch {
        toastError("Couldn't load that conversation");
        setMessages([]);
      }
    },
    [currentSessionId, toastError, cancelActiveStream]
  );

  const renameSession = useCallback(
    async (sessionId, title) => {
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === sessionId ? { ...s, title } : s))
      );
      try {
        await chatApi.rename(sessionId, title);
        success("Chat renamed");
      } catch {
        toastError("Rename failed");
        loadSessions();
      }
    },
    [success, toastError, loadSessions]
  );

  const doDelete = useCallback(
    async (session) => {
      try {
        await chatApi.remove(session.sessionId);
        setSessions((prev) => prev.filter((s) => s.sessionId !== session.sessionId));
        if (session.sessionId === sessionRef.current) startNewChat();
        success("Chat deleted");
      } catch {
        toastError("Delete failed");
      }
    },
    [startNewChat, success, toastError]
  );

  const doClearAll = useCallback(async () => {
    try {
      await chatApi.clearAll();
      setSessions([]);
      startNewChat();
      success("All chats cleared");
    } catch {
      toastError("Couldn't clear chats");
    }
  }, [startNewChat, success, toastError]);

  const handleLogout = useCallback(() => {
    signOut();
  }, [signOut]);

  /* ---- dialog handling ---- */
  const confirmDialog = () => {
    if (!dialog) return;
    if (dialog.type === "delete") doDelete(dialog.session);
    if (dialog.type === "clear") doClearAll();
    setDialog(null);
  };

  return (
    <div className={`shell ${collapsed ? "shell--collapsed" : ""} ${mobileOpen ? "shell--mobile-open" : ""}`}>
      <div className="shell__scrim" onClick={() => setMobileOpen(false)} />

      <Sidebar
        user={user}
        isGuest={isGuest}
        sessions={sessions}
        currentSessionId={currentSessionId}
        aiStatus={aiStatus}
        models={models}
        selectedModel={selectedModel}
        onNewChat={startNewChat}
        onSelect={selectSession}
        onDelete={(s) => setDialog({ type: "delete", session: s })}
        onRename={renameSession}
        onClearAll={() => setDialog({ type: "clear" })}
        onLogout={handleLogout}
        onCollapse={() => setCollapsed(true)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <ChatView
        user={user}
        messages={messages}
        streaming={streaming}
        aiStatus={aiStatus}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onSend={sendMessage}
        onStop={stopGenerating}
        onRegenerate={regenerate}
        onOpenMobile={() => setMobileOpen(true)}
        collapsed={collapsed}
        onExpand={() => setCollapsed(false)}
      />

      <ConfirmDialog
        open={!!dialog}
        danger
        title={dialog?.type === "clear" ? "Clear all chats?" : "Delete this chat?"}
        message={
          dialog?.type === "clear"
            ? "This permanently deletes every conversation. This can't be undone."
            : "This conversation will be permanently deleted. This can't be undone."
        }
        confirmLabel={dialog?.type === "clear" ? "Clear all" : "Delete"}
        onConfirm={confirmDialog}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
}
