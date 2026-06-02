import express from "express";
import {
  sendMessage,
  sendMessageStream,
  getConversationHistory,
  getUserChatSessions,
  renameChatSession,
  deleteChatSession,
  clearAllChats,
  getAIStatus,
  getModels,
} from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Send a message and get bot response (non-streaming)
router.post("/message", sendMessage);

// Send a message and stream the response token-by-token (SSE)
router.post("/message/stream", sendMessageStream);

// List available Groq models + status
router.get("/models", getModels);

// Get AI service status
router.get("/ai-status", getAIStatus);

// Get all chat sessions for the authenticated user
router.get("/sessions", getUserChatSessions);

// Get conversation history for a specific session
router.get("/history/:sessionId", getConversationHistory);

// Rename a specific chat session
router.patch("/session/:sessionId", renameChatSession);

// Delete a specific chat session
router.delete("/session/:sessionId", deleteChatSession);

// Clear all chat history for the user
router.delete("/clear-all", clearAllChats);

export default router;
