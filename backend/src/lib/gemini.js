import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

class GeminiService {
  constructor() {
    // Debug environment variables
    console.log('🔍 Environment Debug:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('PORT:', process.env.PORT);
    console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
    console.log('All env keys containing GEMINI:', Object.keys(process.env).filter(key => key.includes('GEMINI')));
    
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = null;
    this.model = null;
    this.isValidated = false;
    this.initializationAttempted = false;

    if (!this.apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not found in environment variables. Using fallback responses.');
      this.initializationAttempted = true;
      return;
    }

    // Start async initialization
    this.initializeAsync();
  }

  async initializeAsync() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    try {
      console.log('🔄 Initializing Gemini AI...');
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      // Test the API key with a simple request
      console.log('🧪 Testing API key validity...');
      const testResult = await this.model.generateContent('Hello');
      const testResponse = await testResult.response;
      const testText = testResponse.text();
      
      if (testText && testText.trim().length > 0) {
        this.isValidated = true;
        console.log('✅ Gemini AI initialized and validated successfully');
      } else {
        throw new Error('API key test returned empty response');
      }
    } catch (error) {
      console.error('❌ Failed to initialize/validate Gemini AI:', error.message);
      
      // Check if it's an API key error specifically
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key') || 
          error.message.includes('403') || error.message.includes('401')) {
        console.error('🔑 Invalid or unauthorized API key detected');
      }
      
      this.genAI = null;
      this.model = null;
      this.isValidated = false;
    }
  }

  async generateResponse(userMessage, conversationHistory = []) {
    // Wait for initialization if it's still in progress
    if (!this.initializationAttempted) {
      await this.initializeAsync();
    }

    // Fallback to simple responses if Gemini is not available or not validated
    if (!this.genAI || !this.isValidated) {
      return this.getFallbackResponse(userMessage);
    }

    try {
      // Build conversation context
      let contextPrompt = `You are a helpful AI assistant in a chatbot. Please provide helpful, friendly, and concise responses.

Previous conversation context:`;

      // Add recent conversation history (last 10 messages for context)
      const recentHistory = conversationHistory.slice(-10);
      if (recentHistory.length > 0) {
        recentHistory.forEach(msg => {
          contextPrompt += `\n${msg.sender}: ${msg.content}`;
        });
      }

      contextPrompt += `\n\nUser: ${userMessage}\nAssistant:`;

      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from Gemini');
      }

      return text.trim();

    } catch (error) {
      console.error('Gemini AI Error:', error.message);
      
      // If API key becomes invalid during operation, mark as not validated
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('invalid API key') || 
          error.message.includes('403') || error.message.includes('401')) {
        console.error('🔑 API key invalidated during operation');
        this.isValidated = false;
      }
      
      // Return fallback response on error
      return this.getFallbackResponse(userMessage);
    }
  }

  getFallbackResponse(userMessage) {
    const responses = {
      greetings: [
        "Hello! How can I help you today?",
        "Hi there! What would you like to know?",
        "Hey! I'm here to assist you.",
      ],
      questions: [
        "That's an interesting question! Let me think about that...",
        "Great question! Here's what I think...",
        "I'd be happy to help you with that!",
      ],
      general: [
        "Thanks for your message! I'm processing that information.",
        "I understand what you're asking. Here's my response...",
        "That's a great point. Let me provide you with some insights.",
      ],
      goodbye: [
        "Goodbye! Feel free to come back anytime you have questions.",
        "See you later! I'm always here to help.",
        "Take care! Don't hesitate to reach out if you need assistance.",
      ],
      error: [
        "I apologize, but I'm having trouble processing your request right now. Please try again.",
        "Sorry, I encountered an issue. Could you please rephrase your question?",
        "I'm experiencing some technical difficulties. Please try again in a moment.",
      ]
    };

    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return responses.greetings[Math.floor(Math.random() * responses.greetings.length)];
    } else if (lowerMessage.includes('?') || lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why')) {
      return responses.questions[Math.floor(Math.random() * responses.questions.length)];
    } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye') || lowerMessage.includes('see you')) {
      return responses.goodbye[Math.floor(Math.random() * responses.goodbye.length)];
    } else {
      return responses.general[Math.floor(Math.random() * responses.general.length)];
    }
  }

  // Check if Gemini is available and validated
  isAvailable() {
    return this.genAI !== null && this.isValidated;
  }

  // Get service status
  getStatus() {
    return {
      available: this.isAvailable(),
      model: this.isAvailable() ? 'gemini-2.5-flash' : 'fallback',
      apiKeyConfigured: !!this.apiKey,
      validated: this.isValidated,
      initializationAttempted: this.initializationAttempted
    };
  }
}

// Create singleton instance
const geminiService = new GeminiService();

export default geminiService;