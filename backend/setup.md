# Chatbot Backend Setup Guide

## 1. Environment Variables Setup

Create a `.env` file in the backend directory with the following content:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/chatbot-db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Client Configuration
CLIENT_URL=http://localhost:5173
```

## 2. Prerequisites

- Node.js (v16 or higher)
- MongoDB (running locally or MongoDB Atlas)
- npm or yarn

## 3. Installation

```bash
cd backend
npm install
```

## 4. Database Setup

Make sure MongoDB is running on your system:

### Local MongoDB:
```bash
# Start MongoDB service (macOS with Homebrew)
brew services start mongodb/brew/mongodb-community

# Or start manually
mongod --config /usr/local/etc/mongod.conf
```

### MongoDB Atlas:
Update the `MONGODB_URI` in your `.env` file with your Atlas connection string.

## 5. Running the Server

```bash
npm run dev
```

The server will start on `http://localhost:5001`

## 6. API Endpoints

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/check` - Get current user

### Chat Endpoints
- `POST /api/chat/message` - Send message to chatbot
- `GET /api/chat/history/:sessionId` - Get conversation history
- `GET /api/chat/sessions` - Get all user chat sessions
- `DELETE /api/chat/session/:sessionId` - Delete specific chat session
- `DELETE /api/chat/clear-all` - Clear all chat history

### Health Check
- `GET /api/health` - Server health check

## 7. Testing with Postman

See the Postman testing guide below for detailed instructions on how to test each endpoint. 