import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: String,
    required: true,
    enum: ['user', 'bot']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'New chat',
    trim: true
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
chatSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Fast lookups by session and ordered session listings per user
chatSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
chatSchema.index({ userId: 1, updatedAt: -1 });

const Chat = mongoose.model("Chat", chatSchema);

export default Chat; 