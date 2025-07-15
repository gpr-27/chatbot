import Chat from "../models/chat.model.js";
import { v4 as uuidv4 } from 'uuid';
import geminiService from '../lib/gemini.js';

// Send a message and get bot response
export const sendMessage = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: "Message content is required" 
      });
    }

    const currentSessionId = sessionId || uuidv4();

    // Find existing chat session or create new one
    let chat = await Chat.findOne({ userId, sessionId: currentSessionId });
    
    if (!chat) {
      chat = new Chat({
        userId,
        sessionId: currentSessionId,
        messages: []
      });
    }

    // Add user message
    chat.messages.push({
      content: message.trim(),
      sender: 'user',
      timestamp: new Date()
    });

    // Generate bot response using Gemini AI
    const botResponse = await geminiService.generateResponse(
      message.trim(), 
      chat.messages // Pass conversation history for context
    );
    
    // Add bot response
    chat.messages.push({
      content: botResponse,
      sender: 'bot',
      timestamp: new Date()
    });

    // Save the chat
    await chat.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: currentSessionId,
        userMessage: {
          content: message.trim(),
          sender: 'user',
          timestamp: new Date()
        },
        botResponse: {
          content: botResponse,
          sender: 'bot',
          timestamp: new Date()
        },
        aiStatus: geminiService.getStatus()
      }
    });

  } catch (error) {
    console.error("Error in sendMessage:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get AI service status
export const getAIStatus = async (req, res) => {
  try {
    const status = geminiService.getStatus();
    
    res.status(200).json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error in getAIStatus:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get conversation history
export const getConversationHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required"
      });
    }

    const chat = await Chat.findOne({ userId, sessionId });

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt
      }
    });

  } catch (error) {
    console.error("Error in getConversationHistory:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Get all chat sessions for a user
export const getUserChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const chats = await Chat.find({ userId })
      .select('sessionId createdAt updatedAt messages')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalChats = await Chat.countDocuments({ userId });

    const sessions = chats.map(chat => ({
      sessionId: chat.sessionId,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
      lastMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null
    }));

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalChats / limit),
          totalSessions: totalChats,
          hasNext: page < Math.ceil(totalChats / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error in getUserChatSessions:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Delete a chat session
export const deleteChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required"
      });
    }

    const deletedChat = await Chat.findOneAndDelete({ userId, sessionId });

    if (!deletedChat) {
      return res.status(404).json({
        success: false,
        message: "Chat session not found"
      });
    }

    res.status(200).json({
      success: true,
      message: "Chat session deleted successfully"
    });

  } catch (error) {
    console.error("Error in deleteChatSession:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
};

// Clear all chat history for a user
export const clearAllChats = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await Chat.deleteMany({ userId });

    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} chat sessions successfully`
    });

  } catch (error) {
    console.error("Error in clearAllChats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}; 