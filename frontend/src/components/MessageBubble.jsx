import { memo, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import Markdown from "./Markdown";
import Avatar from "./Avatar";
import BrandSpark from "./BrandSpark";

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({ message, userName, streaming, canRegenerate, onRegenerate }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === "user";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`msg ${isUser ? "msg--user" : "msg--bot"}`}>
      <div className="msg__avatar">
        {isUser ? (
          <Avatar name={userName} size={34} />
        ) : (
          <span className="msg__bot-mark">
            <BrandSpark size={20} />
          </span>
        )}
      </div>

      <div className="msg__col">
        <div className="msg__meta">
          <span className="msg__author">{isUser ? userName || "You" : "Groqbot"}</span>
          {message.timestamp && (
            <span className="msg__time">{formatTime(message.timestamp)}</span>
          )}
        </div>

        <div className="msg__bubble">
          {isUser ? (
            <p className="msg__plain">{message.content}</p>
          ) : message.content ? (
            <>
              <Markdown>{message.content}</Markdown>
              {streaming && <span className="stream-caret" aria-hidden="true" />}
            </>
          ) : streaming ? (
            <span className="typing" aria-label="Groqbot is thinking">
              <span /><span /><span />
            </span>
          ) : null}
        </div>

        {!isUser && !streaming && message.content && (
          <div className="msg__actions">
            <button className="msg__action" onClick={copy} title="Copy response">
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
            {canRegenerate && (
              <button
                className="msg__action"
                onClick={onRegenerate}
                title="Regenerate response"
              >
                <RefreshCw size={14} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
