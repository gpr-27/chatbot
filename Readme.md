🔍 Frontend API Call Locations


1. Authentication APIs


📍 App.jsx (Lines 14-29)
API Call: GET /api/auth/check
Purpose: Auto-login check when app loads
Function: checkAuthStatus()
When: On component mount via useEffect()
📍 LoginForm.jsx (Lines 12-28)
API Call: POST /api/auth/login
Purpose: User login
Function: handleSubmit()
When: Form submission with email/password
📍 SignupForm.jsx (Lines 13-29)
API Call: POST /api/auth/signup
Purpose: User registration
Function: handleSubmit()
When: Form submission with fullName, email, password
📍 HomePage.jsx (Lines 173-186)
API Call: POST /api/auth/logout
Purpose: User logout
Function: handleLogout()
When: Logout button clicked


2. Chat APIs


📍 HomePage.jsx (Lines 31-42)
API Call: GET /api/chat/ai-status
Purpose: Check AI service status
Function: checkAIStatus()
When: Component mount + after sending messages
📍 HomePage.jsx (Lines 44-54)
API Call: GET /api/chat/sessions
Purpose: Load user's chat sessions
Function: loadChatSessions()
When: Component mount + after sending messages
📍 HomePage.jsx (Lines 56-68)
API Call: GET /api/chat/history/:sessionId
Purpose: Load conversation history for specific session
Function: loadConversationHistory()
When: Session selection (currentSessionId changes)
📍 HomePage.jsx (Lines 70-117)
API Call: POST /api/chat/message
Purpose: Send message and get AI response
Function: sendMessage()
When: User sends a message via input form
📍 HomePage.jsx (Lines 131-145)
API Call: DELETE /api/chat/session/:sessionId
Purpose: Delete specific chat session
Function: deleteSession()
When: Delete button clicked on session
📍 HomePage.jsx (Lines 147-164)
API Call: DELETE /api/chat/clear-all
Purpose: Clear all chat history
Function: clearAllChats()
When: Clear all button clicked (with confirmation)


3. API Call Flow Summary


App Launch:
├── App.jsx → checkAuthStatus() → GET /api/auth/check
└── If authenticated:
    └── HomePage.jsx → Mount
        ├── checkAIStatus() → GET /api/chat/ai-status
        └── loadChatSessions() → GET /api/chat/sessions

User Actions:
├── Login → LoginForm.jsx → POST /api/auth/login
├── Signup → SignupForm.jsx → POST /api/auth/signup
├── Send Message → HomePage.jsx → POST /api/chat/message
├── Select Session → HomePage.jsx → GET /api/chat/history/:sessionId
├── Delete Session → HomePage.jsx → DELETE /api/chat/session/:sessionId
├── Clear All → HomePage.jsx → DELETE /api/chat/clear-all
└── Logout → HomePage.jsx → POST /api/auth/logout


4. Key Features


🔐 Auto-Authentication: App automatically checks auth status on load
💬 Real-time Chat: Messages sent via POST with immediate UI updates
📚 Session Management: Sessions loaded and managed in sidebar
🤖 AI Status: Continuously monitors Gemini AI availability
🔄 State Sync: API calls update both local state and backend data
All API calls use credentials: 'include' for cookie-based authentication and have proper error handling with user feedback!