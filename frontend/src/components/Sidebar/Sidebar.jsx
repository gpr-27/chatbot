import React, { useState } from 'react';
import './Sidebar.css';
import { assets } from '../../assets/assets.js';

const Sidebar = ({ 
  user, 
  sessions, 
  currentSessionId, 
  onNewChat, 
  onSelectSession, 
  onDeleteSession, 
  onClearAllChats, 
  onLogout,
  aiStatus 
}) => {
  const [extended, setExtended] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const formatSessionTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getSessionPreview = (session) => {
    if (session.lastMessage) {
      const content = session.lastMessage.content;
      return content.length > 30 ? content.substring(0, 30) + '...' : content;
    }
    return 'New conversation';
  };

  return (
    <div className={`sidebar ${extended ? 'extended' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="menu-icon" onClick={() => setExtended(prev => !prev)}>
          <img src={assets.menu_icon} alt="Menu" />
        </div>
        {extended && (
          <div className="header-title">
            <h3>Chat History</h3>
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="new-chat">
        <div className="new-chat-btn" onClick={onNewChat}>
          <img src={assets.plus_icon} alt="New Chat" />
          {extended && <span>New Chat</span>}
        </div>
      </div>

      {/* Chat Sessions */}
      <div className="chat-sessions">
        {extended && (
          <>
            <div className="sessions-header">
              <span>Recent Chats</span>
              {sessions.length > 0 && (
                <button 
                  className="clear-all-btn"
                  onClick={onClearAllChats}
                  title="Clear all chats"
                >
                  <img src={assets.setting_icon} alt="Clear" />
                </button>
              )}
            </div>
            
            <div className="sessions-list">
              {sessions.length === 0 ? (
                <div className="empty-sessions">
                  <p>No chat history yet</p>
                  <span>Start a new conversation to see your chats here</span>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className={`session-item ${currentSessionId === session.sessionId ? 'active' : ''}`}
                    onClick={() => onSelectSession(session.sessionId)}
                  >
                    <div className="session-content">
                      <div className="session-preview">
                        {getSessionPreview(session)}
                      </div>
                      <div className="session-meta">
                        <span className="session-time">
                          {formatSessionTime(session.updatedAt)}
                        </span>
                        <span className="session-count">
                          {session.messageCount} messages
                        </span>
                      </div>
                    </div>
                    <div className="session-actions">
                      <button
                        className="delete-session-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.sessionId);
                        }}
                        title="Delete conversation"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Bottom Section */}
      <div className="sidebar-bottom">
        {/* AI Status */}
        {extended && aiStatus && (
          <div className="ai-status-sidebar">
            <div className="status-item">
              <div className={`status-indicator ${aiStatus.available ? 'online' : 'offline'}`}>
                <div className="status-dot"></div>
              </div>
              <span className="status-text">
                {aiStatus.available ? 'Gemini AI Active' : 'Basic Mode'}
              </span>
            </div>
          </div>
        )}

        {/* Settings & User */}
        <div className="user-section">
          <div className="settings-icon" onClick={() => setShowSettings(prev => !prev)}>
            <img src={assets.setting_icon} alt="Settings" />
            {extended && <span>Settings</span>}
          </div>
          
          {showSettings && extended && (
            <div className="settings-menu">
              <div className="settings-item">
                <img src={assets.question_icon} alt="Help" />
                <span>Help & FAQ</span>
              </div>
              <div className="settings-item" onClick={onClearAllChats}>
                <img src={assets.history_icon} alt="Clear" />
                <span>Clear All Chats</span>
              </div>
              <div className="settings-item logout" onClick={onLogout}>
                <img src={assets.user_icon} alt="Logout" />
                <span>Logout</span>
              </div>
            </div>
          )}
          
          {extended && (
            <div className="user-info">
              <div className="user-avatar">
                <img src={assets.user_icon} alt="User" />
              </div>
              <div className="user-details">
                <div className="user-name">{user.fullName || 'User'}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
