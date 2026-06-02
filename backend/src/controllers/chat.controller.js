import Chat from "../models/chat.model.js";
import { v4 as uuidv4 } from "uuid";
import llmService from "../lib/llm.js";
import { config } from "../config/index.js";
import { logger } from "../lib/logger.js";

/** Find an existing session for this user or create a fresh one. */
async function getOrCreateChat(userId, sessionId) {
  const currentSessionId = sessionId || uuidv4();
  let chat = await Chat.findOne({ userId, sessionId: currentSessionId });
  let isNew = false;

  if (!chat) {
    chat = new Chat({ userId, sessionId: currentSessionId, messages: [] });
    isNew = true;
  }
  return { chat, currentSessionId, isNew };
}

// ---------------------------------------------------------------------------
// POST /api/chat/message  — non-streaming (kept for compatibility / tooling)
// ---------------------------------------------------------------------------
export const sendMessage = async (req, res) => {
  try {
    const { message, sessionId, model } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message content is required" });
    }

    const trimmed = message.trim();
    const { chat, currentSessionId, isNew } = await getOrCreateChat(
      userId,
      sessionId
    );

    logger.info(
      `Chat request — user=${userId} session=${currentSessionId} model=${model || config.llm.defaultModel}`
    );

    chat.messages.push({ content: trimmed, sender: "user", timestamp: new Date() });

    const botResponse = await llmService.generateResponse(
      trimmed,
      chat.messages,
      model
    );

    chat.messages.push({ content: botResponse, sender: "bot", timestamp: new Date() });

    if (isNew || chat.title === "New chat") {
      chat.title = await llmService.generateTitle(trimmed);
    }

    await chat.save();

    res.status(200).json({
      success: true,
      data: {
        sessionId: currentSessionId,
        title: chat.title,
        userMessage: { content: trimmed, sender: "user", timestamp: new Date() },
        botResponse: { content: botResponse, sender: "bot", timestamp: new Date() },
        aiStatus: llmService.getStatus(),
      },
    });
  } catch (error) {
    logger.error("Error in sendMessage:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ---------------------------------------------------------------------------
// POST /api/chat/message/stream  — Server-Sent Events streaming
// Emits: `meta` (sessionId/title), repeated `token` events, then `done`.
// ---------------------------------------------------------------------------
export const sendMessageStream = async (req, res) => {
  const userId = req.user.id;
  const { message, sessionId, model, regenerate } = req.body;

  // Only accept a string sessionId (guards against NoSQL operator injection).
  const safeSessionId = typeof sessionId === "string" ? sessionId : undefined;

  if (!regenerate && (!message || !message.trim())) {
    return res
      .status(400)
      .json({ success: false, message: "Message content is required" });
  }
  if (regenerate && !safeSessionId) {
    return res
      .status(400)
      .json({ success: false, message: "A sessionId is required to regenerate" });
  }

  // SSE handshake
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  // Stop streaming if the client disconnects (saves tokens, avoids write-after-end).
  let clientGone = false;
  req.on("close", () => {
    clientGone = true;
  });

  const send = (event, data) => {
    if (clientGone || res.writableEnded) return false;
    return res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    let chat;
    let currentSessionId = safeSessionId;
    let prompt;
    let title;
    let titlePromise = null; // refined title generated in parallel with streaming

    if (regenerate) {
      // Re-answer the last user message: drop the trailing bot reply, then
      // stream a fresh one. No new user message is added.
      chat = await Chat.findOne({ userId, sessionId: safeSessionId });
      if (!chat || chat.messages.length === 0) {
        send("error", { message: "Nothing to regenerate" });
        return res.end();
      }
      if (chat.messages[chat.messages.length - 1].sender === "bot") {
        chat.messages.pop();
      }
      const last = chat.messages[chat.messages.length - 1];
      if (!last || last.sender !== "user") {
        send("error", { message: "No user message to regenerate from" });
        return res.end();
      }
      prompt = last.content;
      title = chat.title;
    } else {
      const created = await getOrCreateChat(userId, safeSessionId);
      chat = created.chat;
      currentSessionId = created.currentSessionId;
      prompt = message.trim();

      chat.messages.push({ content: prompt, sender: "user", timestamp: new Date() });

      // Use an instant truncated title now; refine it via the LLM in parallel
      // so the first token is never delayed by a title round-trip.
      title = chat.title;
      if (created.isNew || chat.title === "New chat") {
        title = llmService.truncateTitle(prompt);
        chat.title = title;
        titlePromise = llmService.generateTitle(prompt);
      }
    }

    logger.info(
      `Stream request — user=${userId} session=${currentSessionId} model=${model || config.llm.defaultModel} regenerate=${!!regenerate}`
    );

    send("meta", { sessionId: currentSessionId, title, regenerate: !!regenerate });

    // History excludes the final user prompt (passed separately to the model).
    const history = chat.messages.slice(0, -1);

    let full = "";
    for await (const token of llmService.generateStream(prompt, history, model)) {
      if (clientGone) break;
      full += token;
      send("token", { token });
    }

    // Resolve the refined title (already running) before persisting.
    if (titlePromise) {
      try {
        const refined = await titlePromise;
        if (refined) {
          title = refined;
          chat.title = refined;
        }
      } catch {
        /* keep provisional title */
      }
    }

    chat.messages.push({ content: full, sender: "bot", timestamp: new Date() });
    await chat.save();

    send("done", {
      sessionId: currentSessionId,
      title,
      aiStatus: llmService.getStatus(),
    });
  } catch (error) {
    logger.error("Error in sendMessageStream:", error);
    send("error", { message: "Streaming failed. Please try again." });
  } finally {
    res.end();
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/models  — list available LLM models + live status
// ---------------------------------------------------------------------------
export const getModels = async (_req, res) => {
  res.status(200).json({
    success: true,
    data: { models: config.llm.models, status: llmService.getStatus() },
  });
};

// ---------------------------------------------------------------------------
// GET /api/chat/ai-status
// ---------------------------------------------------------------------------
export const getAIStatus = async (_req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: { ...llmService.getStatus(), timestamp: new Date().toISOString() },
    });
  } catch (error) {
    logger.error("Error in getAIStatus:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/history/:sessionId
// ---------------------------------------------------------------------------
export const getConversationHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "Session ID is required" });
    }

    const chat = await Chat.findOne({ userId, sessionId });
    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }

    res.status(200).json({
      success: true,
      data: {
        sessionId,
        title: chat.title,
        messages: chat.messages,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Error in getConversationHistory:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// GET /api/chat/sessions
// ---------------------------------------------------------------------------
export const getUserChatSessions = async (req, res) => {
  try {
    const userId = req.user.id;
    // Clamp pagination so NaN/negative/huge values can't reach Mongo.
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const chats = await Chat.find({ userId })
      .select("sessionId title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const totalChats = await Chat.countDocuments({ userId });

    const sessions = chats.map((chat) => ({
      sessionId: chat.sessionId,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
      lastMessage:
        chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalChats / limit),
          totalSessions: totalChats,
          hasNext: page < Math.ceil(totalChats / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    logger.error("Error in getUserChatSessions:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/chat/session/:sessionId  — rename a conversation
// ---------------------------------------------------------------------------
export const renameChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Title is required" });
    }

    const chat = await Chat.findOneAndUpdate(
      { userId, sessionId },
      { title: title.trim().slice(0, 80) },
      { new: true }
    );

    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Chat session not found" });
    }

    res.status(200).json({
      success: true,
      data: { sessionId, title: chat.title },
    });
  } catch (error) {
    logger.error("Error in renameChatSession:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/chat/session/:sessionId
// ---------------------------------------------------------------------------
export const deleteChatSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    if (!sessionId) {
      return res
        .status(400)
        .json({ success: false, message: "Session ID is required" });
    }

    const deleted = await Chat.findOneAndDelete({ userId, sessionId });
    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Chat session not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "Chat session deleted successfully" });
  } catch (error) {
    logger.error("Error in deleteChatSession:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/chat/clear-all
// ---------------------------------------------------------------------------
export const clearAllChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await Chat.deleteMany({ userId });
    res.status(200).json({
      success: true,
      message: `Deleted ${result.deletedCount} chat sessions successfully`,
    });
  } catch (error) {
    logger.error("Error in clearAllChats:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};
