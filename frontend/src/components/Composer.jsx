import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

export default function Composer({ onSend, onStop, streaming, disabled }) {
  const [value, setValue] = useState("");
  const taRef = useRef(null);

  const resize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  useEffect(resize, [value]);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    onSend(text);
    setValue("");
    requestAnimationFrame(() => {
      if (taRef.current) taRef.current.style.height = "auto";
    });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="composer">
      <div className="composer__glow" aria-hidden="true" />
      <div className={`composer__box ${streaming ? "is-busy" : ""}`}>
        <textarea
          ref={taRef}
          className="composer__input"
          value={value}
          rows={1}
          placeholder={streaming ? "Groqbot is responding…" : "Message Groqbot…"}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          aria-label="Message input"
        />
        {streaming ? (
          <button
            className="composer__send composer__send--stop"
            onClick={onStop}
            title="Stop generating"
            aria-label="Stop generating"
          >
            <Square size={16} fill="currentColor" />
          </button>
        ) : (
          <button
            className="composer__send"
            onClick={submit}
            disabled={!value.trim() || disabled}
            title="Send message"
            aria-label="Send message"
          >
            <ArrowUp size={18} strokeWidth={2.4} />
          </button>
        )}
      </div>
      <p className="composer__hint">
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line ·
        Groqbot can make mistakes — verify important info.
      </p>
    </div>
  );
}
