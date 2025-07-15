import express from "express";
import { 
  sendMessage, 
  getConversationHistory, 
  getUserChatSessions, 
  deleteChatSession, 
  clearAllChats,
  getAIStatus  // Add this new import
} from "../controllers/chat.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protectRoute);

// Send a message and get bot response
router.post("/message", sendMessage);

// Get conversation history for a specific session
router.get("/history/:sessionId", getConversationHistory);

// Get all chat sessions for the authenticated user
router.get("/sessions", getUserChatSessions);

// Delete a specific chat session
router.delete("/session/:sessionId", deleteChatSession);

// Clear all chat history for the user
router.delete("/clear-all", clearAllChats);

// Get AI service status
router.get("/ai-status", getAIStatus);

export default router;