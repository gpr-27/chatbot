import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar/Sidebar';
import Main from './Main/Main';
import '../styles/HomePage.css';

function HomePage({ user, onLogout }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiStatus, setAiStatus] = useState(null);

  // Load chat sessions on component mount
  useEffect(() => {
    loadChatSessions();
    checkAIStatus();
  }, []);

  // Load conversation history when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadConversationHistory(currentSessionId);
    }
  }, [currentSessionId]);

  const checkAIStatus = async () => {
    try {
      const response = await fetch('/api/chat/ai-status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setAiStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to check AI status:', error);
    }
  };

  const loadChatSessions = async () => {
    try {
      const response = await fetch('/api/chat/sessions', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.data.sessions);
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
    }
  };

  const loadConversationHistory = async (sessionId) => {
    try {
      const response = await fetch(`/api/chat/history/${sessionId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data.messages);
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error);
      setMessages([]);
    }
  };

  const sendMessage = async (message) => {
    if (!message.trim()) return;

    setLoading(true);
    setError('');

    // Add user message to UI immediately
    const userMessage = {
      content: message,
      sender: 'user',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message,
          sessionId: currentSessionId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set session ID if it's a new conversation
        if (!currentSessionId) {
          setCurrentSessionId(data.data.sessionId);
        }

        // Add bot response to messages
        setMessages(prev => [...prev, data.data.botResponse]);
        
        // Reload sessions to update the sidebar
        loadChatSessions();
        
        // Update AI status
        if (data.data.aiStatus) {
          setAiStatus(data.data.aiStatus);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to send message');
        // Remove the user message if sending failed
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      // Remove the user message if sending failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setError('');
  };

  const selectSession = (sessionId) => {
    setCurrentSessionId(sessionId);
    setError('');
  };

  const deleteSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/chat/session/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Remove session from list
        setSessions(prev => prev.filter(session => session.sessionId !== sessionId));
        
        // If deleted session was current, start new chat
        if (currentSessionId === sessionId) {
          startNewChat();
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const clearAllChats = async () => {
    if (!window.confirm('Are you sure you want to clear all chat history?')) {
      return;
    }

    try {
      const response = await fetch('/api/chat/clear-all', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSessions([]);
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to clear all chats:', error);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        onLogout();
      } else {
        setError('Logout failed');
      }
    } catch (err) {
      setError('Logout failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="homepage">
      <Sidebar
        user={user}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={startNewChat}
        onSelectSession={selectSession}
        onDeleteSession={deleteSession}
        onClearAllChats={clearAllChats}
        onLogout={handleLogout}
        aiStatus={aiStatus}
      />
      <Main
        messages={messages}
        onSendMessage={sendMessage}
        loading={loading}
        error={error}
        currentSessionId={currentSessionId}
        aiStatus={aiStatus}
      />
    </div>
  );
}

export default HomePage; 