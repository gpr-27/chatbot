import { useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Menu, PanelLeftOpen, Zap } from "lucide-react";
import MessageBubble from "./MessageBubble";
import WelcomeScreen from "./WelcomeScreen";
import Composer from "./Composer";
import ModelPicker from "./ModelPicker";
import ThemeToggle from "./ThemeToggle";

export default function ChatView({
  user,
  messages,
  streaming,
  aiStatus,
  models,
  selectedModel,
  onModelChange,
  onSend,
  onStop,
  onRegenerate,
  onOpenMobile,
  collapsed,
  onExpand,
}) {
  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const [atBottom, setAtBottom] = useState(true);
  const isEmpty = messages.length === 0;

  const scrollToBottom = (behavior = "smooth") =>
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });

  // Track whether the user is pinned to the bottom.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAtBottom(nearBottom);
  };

  // Keep view pinned to bottom while streaming / on new messages.
  useLayoutEffect(() => {
    if (atBottom) scrollToBottom(streaming ? "auto" : "smooth");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, streaming]);

  const lastBotIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "bot") return i;
    }
    return -1;
  })();

  const modelName = aiStatus?.available
    ? models?.find((m) => m.id === selectedModel)?.name
    : "Basic mode";

  return (
    <section className="chat">
      <header className="chat__header">
        <div className="chat__header-left">
          <button className="icon-btn chat__menu" onClick={onOpenMobile} aria-label="Open menu">
            <Menu size={20} />
          </button>
          {collapsed && (
            <button className="icon-btn chat__expand" onClick={onExpand} aria-label="Expand sidebar" title="Expand sidebar">
              <PanelLeftOpen size={20} />
            </button>
          )}
          <ModelPicker
            models={models}
            value={selectedModel}
            onChange={onModelChange}
            disabled={streaming || !aiStatus?.available}
          />
        </div>
        <div className="chat__header-right">
          <span className={`chat__status ${aiStatus?.available ? "online" : "offline"}`}>
            <Zap size={13} />
            {aiStatus?.available ? "Groq · live" : "Basic mode"}
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="chat__scroll" ref={scrollRef} onScroll={onScroll}>
        {isEmpty ? (
          <WelcomeScreen userName={user.fullName} onPick={onSend} modelName={modelName} />
        ) : (
          <div className="chat__thread">
            {messages.map((m, i) => (
              <MessageBubble
                key={m._id || i}
                message={m}
                userName={user.fullName}
                streaming={streaming && i === messages.length - 1 && m.sender === "bot"}
                canRegenerate={!streaming && i === lastBotIndex}
                onRegenerate={onRegenerate}
              />
            ))}
            <div ref={bottomRef} className="chat__anchor" />
          </div>
        )}
      </div>

      <div className="chat__composer-wrap">
        {!atBottom && !isEmpty && (
          <button
            className="scroll-down"
            onClick={() => scrollToBottom()}
            aria-label="Scroll to latest"
          >
            <ArrowDown size={18} />
          </button>
        )}
        <Composer
          onSend={onSend}
          onStop={onStop}
          streaming={streaming}
          disabled={false}
        />
      </div>
    </section>
  );
}
