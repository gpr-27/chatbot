import React, { useState, useRef, useEffect } from "react";
import "./Main.css";
import { assets } from "../../assets/assets.js";

const Main = ({
  messages,
  onSendMessage,
  loading,
  error,
  currentSessionId,
  aiStatus,
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAIStatusDisplay = () => {
    if (!aiStatus) return "🤖 AI Assistant";

    if (aiStatus.available) {
      return "🤖 AI Assistant (Gemini Powered)";
    } else {
      return "💭 AI Assistant (Basic Mode)";
    }
  };

  const adjustTextareaHeight = (textarea) => {
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
  };

  return (
    <div className="main">
      {/* Header */}
      <div className="main-header">
        <div className="header-content">
          <div className="ai-status">
            <img src={assets.gemini_icon} alt="AI" className="ai-icon" />
            <span className="ai-title">{getAIStatusDisplay()}</span>
          </div>
          {aiStatus && (
            <div className="status-indicator">
              <div
                className={`status-dot ${
                  aiStatus.available ? "online" : "offline"
                }`}
              ></div>
              <span className="status-text">
                {aiStatus.available ? "Online" : "Offline"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-content">
              <img
                src={assets.gemini_icon}
                alt="Gemini AI"
                className="welcome-icon"
              />
              <h2>Hello! How can I help you today?</h2>
              <p>Start a conversation by typing a message below.</p>

              <div className="example-prompts">
                <div
                  className="prompt-card"
                  onClick={() => setInput("What can you help me with?")}
                >
                  <img src={assets.question_icon} alt="" />
                  <span>What can you help me with?</span>
                </div>
                <div
                  className="prompt-card"
                  onClick={() =>
                    setInput("Tell me about artificial intelligence")
                  }
                >
                  <img src={assets.bulb_icon} alt="" />
                  <span>Tell me about AI</span>
                </div>
                <div
                  className="prompt-card"
                  onClick={() => setInput("Help me write some code")}
                >
                  <img src={assets.code_icon} alt="" />
                  <span>Help me write code</span>
                </div>
                <div
                  className="prompt-card"
                  onClick={() => setInput("Explain quantum computing")}
                >
                  <img src={assets.compass_icon} alt="" />
                  <span>Explain quantum computing</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="messages-container">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                <div className="message-avatar">
                  {message.sender === "user" ? (
                    <img src={assets.user_icon} alt="User" />
                  ) : (
                    <img src={assets.gemini_icon} alt="AI" />
                  )}
                </div>
                <div className="message-content">
                  <div className="message-text">{message.content}</div>
                  <div className="message-time">
                    {formatTimestamp(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="message bot">
                <div className="message-avatar">
                  <img src={assets.gemini_icon} alt="AI" />
                </div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Input Area */}
      <div className="input-area">
        <form onSubmit={handleSubmit} className="input-form">
          <div className="input-container">
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                adjustTextareaHeight(e.target);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Type your message here..."
              className="message-input"
              rows="1"
              disabled={loading}
              style={{ overflow: "hidden" }}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!input.trim() || loading}
            >
              <img src={assets.send_icon} alt="Send" />
            </button>
          </div>
        </form>

        <div className="input-footer">
          <p>AI may make mistakes. Please verify important information.</p>
        </div>
      </div>
    </div>
  );
};

export default Main;
