import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  LogOut,
  MessageSquarePlus,
  PanelLeftClose,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { SignUpButton } from "@clerk/react";
import BrandSpark from "./BrandSpark";
import Avatar from "./Avatar";
import ThemeToggle from "./ThemeToggle";

function bucketFor(date) {
  const d = new Date(date);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((startOfToday - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "Previous 7 days";
  if (diffDays <= 30) return "Previous 30 days";
  return "Older";
}
const BUCKET_ORDER = ["Today", "Yesterday", "Previous 7 days", "Previous 30 days", "Older"];

export default function Sidebar({
  user,
  isGuest,
  sessions,
  currentSessionId,
  aiStatus,
  models,
  selectedModel,
  onNewChat,
  onSelect,
  onDelete,
  onRename,
  onClearAll,
  onLogout,
  onCollapse,
  onCloseMobile,
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const editRef = useRef(null);
  const userCardRef = useRef(null);

  // Close the user menu on Escape or an outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDocClick = (e) => {
      if (userCardRef.current && !userCardRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? sessions.filter(
          (s) =>
            (s.title || "").toLowerCase().includes(q) ||
            (s.lastMessage?.content || "").toLowerCase().includes(q)
        )
      : sessions;
    const map = {};
    for (const s of filtered) {
      const b = bucketFor(s.updatedAt);
      (map[b] ||= []).push(s);
    }
    return BUCKET_ORDER.filter((b) => map[b]?.length).map((b) => [b, map[b]]);
  }, [sessions, query]);

  const startRename = (s) => {
    setEditing(s.sessionId);
    setDraft(s.title || "New chat");
    requestAnimationFrame(() => editRef.current?.select());
  };
  const commitRename = (s) => {
    const t = draft.trim();
    if (t && t !== s.title) onRename(s.sessionId, t);
    setEditing(null);
  };

  const online = aiStatus?.available;
  // Show the currently SELECTED model (from the picker), not the backend default.
  const selectedModelName =
    models?.find((m) => m.id === selectedModel)?.name || null;

  return (
    <aside className="sidebar">
      <div className="sidebar__top">
        <div className="brand" onClick={onNewChat} title="Groqbot — new chat">
          <BrandSpark size={28} glow />
          <span className="brand__name">
            Groq<span className="grad-text">bot</span>
          </span>
        </div>
        <div className="sidebar__top-actions">
          <button className="icon-btn sidebar__mobile-close" onClick={onCloseMobile} aria-label="Close menu">
            <X size={18} />
          </button>
          <button className="icon-btn sidebar__collapse" onClick={onCollapse} title="Collapse sidebar" aria-label="Collapse sidebar">
            <PanelLeftClose size={18} />
          </button>
        </div>
      </div>

      <button className="new-chat" onClick={onNewChat}>
        <MessageSquarePlus size={18} />
        <span>New chat</span>
        <span className="new-chat__kbd">⌘K</span>
      </button>

      <div className="sidebar__search">
        <Search size={15} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search chats"
          aria-label="Search chats"
        />
        {query && (
          <button className="sidebar__search-clear" onClick={() => setQuery("")} aria-label="Clear search">
            <X size={14} />
          </button>
        )}
      </div>

      <nav className="sessions">
        {sessions.length === 0 ? (
          <div className="sessions__empty">
            <div className="sessions__empty-mark">
              <MessageSquarePlus size={22} />
            </div>
            <p>No conversations yet</p>
            <span>Start a new chat to see it here.</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="sessions__empty">
            <p>No matches</p>
            <span>Try a different search.</span>
          </div>
        ) : (
          grouped.map(([bucket, items]) => (
            <div key={bucket} className="sessions__group">
              <div className="sessions__label">{bucket}</div>
              {items.map((s) => {
                const active = s.sessionId === currentSessionId;
                const isEditing = editing === s.sessionId;
                return (
                  <div
                    key={s.sessionId}
                    className={`session ${active ? "active" : ""}`}
                    role="button"
                    tabIndex={isEditing ? -1 : 0}
                    aria-current={active ? "true" : undefined}
                    onClick={() => !isEditing && onSelect(s.sessionId)}
                    onKeyDown={(e) => {
                      if (isEditing) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(s.sessionId);
                      }
                    }}
                  >
                    {isEditing ? (
                      <input
                        ref={editRef}
                        className="session__edit"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename(s);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        onBlur={() => commitRename(s)}
                      />
                    ) : (
                      <span className="session__title">{s.title || "New chat"}</span>
                    )}

                    {!isEditing && (
                      <span className="session__actions" onClick={(e) => e.stopPropagation()}>
                        <button className="session__act" title="Rename" onClick={() => startRename(s)}>
                          <Pencil size={14} />
                        </button>
                        <button className="session__act danger" title="Delete" onClick={() => onDelete(s)}>
                          <Trash2 size={14} />
                        </button>
                      </span>
                    )}
                    {isEditing && (
                      <button
                        className="session__act"
                        title="Save"
                        onClick={(e) => {
                          e.stopPropagation();
                          commitRename(s);
                        }}
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </nav>

      <div className="sidebar__bottom">
        {isGuest && (
          <SignUpButton mode="modal">
            <button className="guest-upgrade" type="button" title="Create an account">
              <Sparkles size={15} />
              <span className="guest-upgrade__text">
                <strong>Save your work</strong>
                Create an account to permanently save and sync your chats.
              </span>
            </button>
          </SignUpButton>
        )}

        <div className="status-pill" title={online ? "Connected to Groq" : "Running in basic mode"}>
          <span className={`status-pill__dot ${online ? "online" : "offline"}`} />
          <span>{online ? "Groq connected" : "Basic mode"}</span>
          {online && selectedModelName && (
            <span className="status-pill__model">{selectedModelName}</span>
          )}
        </div>

        <div className={`user-card ${menuOpen ? "open" : ""}`} ref={userCardRef}>
          {menuOpen && (
            <div className="user-menu">
              <div className="user-menu__row">
                <span>Theme</span>
                <ThemeToggle compact />
              </div>
              <button
                className="user-menu__item"
                onClick={() => {
                  setMenuOpen(false);
                  onClearAll();
                }}
              >
                <Trash2 size={15} />
                Clear all chats
              </button>
              <button className="user-menu__item danger" onClick={onLogout}>
                <LogOut size={15} />
                {isGuest ? "End guest session" : "Log out"}
              </button>
            </div>
          )}
          <button
            className="user-card__btn"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <Avatar name={user.fullName || user.email || "Guest"} size={36} />
            <span className="user-card__info">
              <span className="user-card__name">{user.fullName || "User"}</span>
              <span className="user-card__email">
                {isGuest ? "Guest · sign up to save" : user.email}
              </span>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
