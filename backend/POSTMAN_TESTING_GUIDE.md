# Postman Testing Guide for Chatbot Backend

## Setup Instructions

1. **Start the Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server should be running on `http://localhost:5001`

2. **Open Postman** and create a new collection called "Chatbot API"

## Testing Flow

### Step 1: Health Check

**Request:**
- Method: `GET`
- URL: `http://localhost:5001/api/health`
- Headers: None required

**Expected Response:**
```json
{
  "success": true,
  "message": "Server is running successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Step 2: User Registration

**Request:**
- Method: `POST`
- URL: `http://localhost:5001/api/auth/signup`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "_id": "user_id_here",
    "fullName": "John Doe",
    "email": "john@example.com"
  }
}
```

### Step 3: User Login

**Request:**
- Method: `POST`
- URL: `http://localhost:5001/api/auth/login`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged in successfully",
  "user": {
    "_id": "user_id_here",
    "fullName": "John Doe",
    "email": "john@example.com"
  }
}
```

**Important:** After login, a JWT token is set as an HTTP-only cookie. Make sure Postman is configured to handle cookies automatically.

### Step 4: Send Chat Message

**Request:**
- Method: `POST`
- URL: `http://localhost:5001/api/chat/message`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "message": "Hello, how are you?"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "generated-uuid-here",
    "userMessage": {
      "content": "Hello, how are you?",
      "sender": "user",
      "timestamp": "2024-01-15T10:30:00.000Z"
    },
    "botResponse": {
      "content": "Hello! How can I help you today?",
      "sender": "bot",
      "timestamp": "2024-01-15T10:30:01.000Z"
    }
  }
}
```

### Step 5: Send Another Message in Same Session

**Request:**
- Method: `POST`
- URL: `http://localhost:5001/api/chat/message`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "message": "What's the weather like?",
  "sessionId": "use-session-id-from-previous-response"
}
```

### Step 6: Get Conversation History

**Request:**
- Method: `GET`
- URL: `http://localhost:5001/api/chat/history/SESSION_ID_HERE`
- Headers: None (cookies automatically sent)

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "session-id-here",
    "messages": [
      {
        "content": "Hello, how are you?",
        "sender": "user",
        "timestamp": "2024-01-15T10:30:00.000Z"
      },
      {
        "content": "Hello! How can I help you today?",
        "sender": "bot",
        "timestamp": "2024-01-15T10:30:01.000Z"
      }
    ],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:01.000Z"
  }
}
```

### Step 7: Get All Chat Sessions

**Request:**
- Method: `GET`
- URL: `http://localhost:5001/api/chat/sessions`
- Headers: None (cookies automatically sent)
- Query Parameters (optional):
  - `page=1`
  - `limit=10`

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "session-id-here",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:01.000Z",
        "messageCount": 4,
        "lastMessage": {
          "content": "Thanks for the help!",
          "sender": "user",
          "timestamp": "2024-01-15T10:35:00.000Z"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalSessions": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### Step 8: Delete a Chat Session

**Request:**
- Method: `DELETE`
- URL: `http://localhost:5001/api/chat/session/SESSION_ID_HERE`
- Headers: None (cookies automatically sent)

**Expected Response:**
```json
{
  "success": true,
  "message": "Chat session deleted successfully"
}
```

### Step 9: Clear All Chat History

**Request:**
- Method: `DELETE`
- URL: `http://localhost:5001/api/chat/clear-all`
- Headers: None (cookies automatically sent)

**Expected Response:**
```json
{
  "success": true,
  "message": "Deleted 2 chat sessions successfully"
}
```

### Step 10: Get Current User

**Request:**
- Method: `GET`
- URL: `http://localhost:5001/api/auth/check`
- Headers: None (cookies automatically sent)

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "_id": "user_id_here",
    "fullName": "John Doe",
    "email": "john@example.com"
  }
}
```

### Step 11: Logout

**Request:**
- Method: `POST`
- URL: `http://localhost:5001/api/auth/logout`
- Headers: None (cookies automatically sent)

**Expected Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## Important Notes

1. **Authentication**: All chat endpoints require authentication. Make sure you're logged in before testing chat endpoints.

2. **Session Management**: Each conversation has a unique `sessionId`. If you don't provide one, a new session will be created.

3. **Cookie Handling**: Postman should automatically handle cookies. If you're having issues, check Postman's cookie settings.

4. **Error Responses**: All endpoints return standardized error responses:
   ```json
   {
     "success": false,
     "message": "Error description here",
     "error": "Detailed error information"
   }
   ```

## Testing Different Scenarios

### Test Invalid Authentication
Try accessing `/api/chat/message` without logging in first. You should get a 401 error.

### Test Different Message Types
Try sending various types of messages to see different bot responses:
- Greetings: "Hello", "Hi", "Hey"
- Questions: "What is your name?", "How do you work?"
- Goodbyes: "Bye", "Goodbye", "See you later"

### Test Error Scenarios
- Send empty message: `{"message": ""}`
- Send request without message field: `{}`
- Access non-existent session: `/api/chat/history/invalid-session-id`

## Postman Collection Import

You can create a Postman collection with all these requests and export it for easy sharing and reuse. 