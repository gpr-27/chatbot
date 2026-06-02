import Groq from "groq-sdk";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

// ===========================================================================
// Provider-agnostic LLM service.
//
// The active provider is selected purely from config (LLM_PROVIDER). All model
// ids, the api key, the default/title models and the display metadata come from
// `config.llm.*` — there are NO hardcoded model id strings here. The only
// provider-specific identifiers in this file are the adapter registry key
// "groq" and the `groq-sdk` import; both represent an implementation that is
// *chosen* by the environment, not a baked-in configuration value.
// ===========================================================================

// Product identity. "Groqbot" is the bot's brand name (not an environment
// value); the prompt is deliberately provider/hardware-neutral so it stays
// accurate no matter which inference backend is configured.
const SYSTEM_PROMPT = `You are Groqbot, a sharp, friendly AI assistant.

Guidelines:
- Be helpful, clear, and genuinely useful. Get to the point.
- Use GitHub-flavored Markdown: headings, **bold**, lists, tables, and fenced code blocks with language hints (e.g. \`\`\`js).
- For code, always specify the language and keep examples runnable.
- When you are unsure, say so honestly rather than inventing facts.
- Match the user's tone; be concise for simple questions and thorough for complex ones.`;

// ---------------------------------------------------------------------------
// Provider adapter registry.
//
// Each adapter knows how to construct a vendor client from an api key and how
// to issue chat completions (streaming + non-streaming). The active adapter is
// looked up by `config.llm.provider`, so adding a new provider is a matter of
// registering another entry here — no other code changes required.
// ---------------------------------------------------------------------------
const PROVIDER_ADAPTERS = {
  groq: {
    createClient(apiKey) {
      return new Groq({ apiKey });
    },
    async createCompletion(client, { model, messages, stream }) {
      return client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95,
        ...(stream ? { stream: true } : {}),
      });
    },
    async createTitleCompletion(client, { model, messages }) {
      return client.chat.completions.create({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 20,
      });
    },
    async ping(client, { model }) {
      return client.chat.completions.create({
        model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      });
    },
  },
};

class LLMService {
  constructor() {
    this.provider = config.llm.provider;
    this.apiKey = config.llm.apiKey;
    this.adapter = PROVIDER_ADAPTERS[this.provider] || null;
    this.client = null;
    this.isValidated = false;
    this.initializationAttempted = false;

    if (!this.adapter) {
      logger.error(
        `No LLM adapter registered for provider "${this.provider}". Running in fallback mode.`
      );
      this.initializationAttempted = true;
      return;
    }

    if (!this.apiKey) {
      logger.warn(
        `${config.llm.providerLabel} API key not configured. Falling back to canned responses.`
      );
      this.initializationAttempted = true;
      return;
    }

    logger.info(`LLM provider selected: ${this.provider}`);
    this.initializeAsync();
  }

  async initializeAsync() {
    if (this.client) return;
    if (!this.adapter || !this.apiKey) {
      this.initializationAttempted = true;
      return;
    }

    try {
      logger.info(`Initializing ${config.llm.providerLabel} client...`);
      this.client = this.adapter.createClient(this.apiKey);

      // Lightweight validation: a tiny completion confirms the key works. Uses
      // the cheap/fast title model rather than any hardcoded model id.
      const test = await this.adapter.ping(this.client, {
        model: config.llm.titleModel,
      });

      if (test?.choices?.length) {
        this.isValidated = true;
        logger.info(`${config.llm.providerLabel} initialized and validated successfully`);
      } else {
        throw new Error("Validation returned an empty response");
      }
    } catch (error) {
      logger.error(`Failed to initialize/validate ${config.llm.providerLabel}:`, error.message);
      if (/401|invalid|unauthor|api key/i.test(error.message)) {
        logger.error(`Invalid or unauthorized ${config.llm.providerLabel} API key detected`);
      }
      this.client = null;
      this.isValidated = false;
    } finally {
      this.initializationAttempted = true;
    }
  }

  resolveModel(model) {
    return model && config.llm.modelIds.includes(model) ? model : config.llm.defaultModel;
  }

  /** Build the OpenAI-style message array providers expect. */
  buildMessages(userMessage, conversationHistory = []) {
    const recent = conversationHistory.slice(-12);
    const history = recent.map((msg) => ({
      role: msg.sender === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    return [
      { role: "system", content: SYSTEM_PROMPT },
      ...history,
      { role: "user", content: userMessage },
    ];
  }

  /** Non-streaming completion. Returns a string (never throws). */
  async generateResponse(userMessage, conversationHistory = [], model) {
    if (!this.initializationAttempted) await this.initializeAsync();
    if (!this.client) return this.getFallbackResponse(userMessage);

    const resolved = this.resolveModel(model);
    logger.debug(`LLM request (${this.provider}, model=${resolved})`);

    try {
      const completion = await this.adapter.createCompletion(this.client, {
        model: resolved,
        messages: this.buildMessages(userMessage, conversationHistory),
        stream: false,
      });

      const text = completion?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new Error("Empty response from provider");
      return text;
    } catch (error) {
      logger.error(`${config.llm.providerLabel} error:`, error.message);
      if (/401|invalid api key|unauthor/i.test(error.message)) {
        this.isValidated = false;
      }
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Streaming completion. Yields incremental text tokens.
   * On failure it transparently yields a fallback response so the client
   * always receives *something* and the stream terminates cleanly.
   */
  async *generateStream(userMessage, conversationHistory = [], model) {
    if (!this.initializationAttempted) await this.initializeAsync();

    if (!this.client) {
      yield this.getFallbackResponse(userMessage);
      return;
    }

    const resolved = this.resolveModel(model);
    logger.debug(`LLM stream request (${this.provider}, model=${resolved})`);

    try {
      const stream = await this.adapter.createCompletion(this.client, {
        model: resolved,
        messages: this.buildMessages(userMessage, conversationHistory),
        stream: true,
      });

      let produced = false;
      for await (const chunk of stream) {
        const token = chunk?.choices?.[0]?.delta?.content || "";
        if (token) {
          produced = true;
          yield token;
        }
      }
      if (!produced) yield this.getFallbackResponse(userMessage);
    } catch (error) {
      logger.error(`${config.llm.providerLabel} stream error:`, error.message);
      if (/401|invalid api key|unauthor/i.test(error.message)) {
        this.isValidated = false;
      }
      yield this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Generate a short, human-readable title for a conversation from its first
   * user message. Uses the cheap/fast title model; falls back to a truncation.
   */
  async generateTitle(firstMessage) {
    const fallback = this.truncateTitle(firstMessage);
    if (!this.client) return fallback;

    const resolved = config.llm.titleModel;
    logger.debug(`LLM title request (${this.provider}, model=${resolved})`);

    try {
      const completion = await this.adapter.createTitleCompletion(this.client, {
        model: resolved,
        messages: [
          {
            role: "system",
            content:
              "Generate a concise 3-5 word title for the conversation that starts with the user's message. Reply with ONLY the title — no quotes, no punctuation at the end, no preamble.",
          },
          { role: "user", content: firstMessage },
        ],
      });

      const title = completion?.choices?.[0]?.message?.content
        ?.replace(/^["'`]+|["'`]+$/g, "")
        .replace(/[.]+$/, "")
        .trim();

      return title && title.length <= 60 ? title : fallback;
    } catch (error) {
      logger.error("Title generation error:", error.message);
      return fallback;
    }
  }

  truncateTitle(message) {
    const clean = (message || "New chat").trim().replace(/\s+/g, " ");
    if (clean.length <= 42) return clean;
    return clean.slice(0, 42).trimEnd() + "…";
  }

  getFallbackResponse(userMessage) {
    const responses = {
      greetings: [
        "Hey there! 👋 I'm here, but I'm in **basic mode** right now because no API key is configured. Add an API key to unlock full power!",
        "Hello! I'd love to help. Right now I'm in offline fallback mode — set up your provider API key to get real AI responses.",
      ],
      questions: [
        "Great question! I'd answer it properly, but I'm currently in **fallback mode**. Configure an API key on the server to enable live responses.",
        "I can tell that's worth a real answer — unfortunately I'm running without an AI connection right now. Add an API key to get started!",
      ],
      goodbye: [
        "Take care! Come back once the API key is set up for the full experience. 👋",
        "See you soon! Don't forget to add your provider API key for real answers.",
      ],
      general: [
        "I received your message! I'm currently in **basic mode** — add an API key to the backend `.env` to enable AI-powered responses.",
        "Thanks for the message! To get genuine AI replies, configure the provider API key on the server.",
      ],
    };

    const m = userMessage.toLowerCase();
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    if (/\b(hello|hi|hey|yo)\b/.test(m)) return pick(responses.greetings);
    if (/\b(bye|goodbye|see you|cya)\b/.test(m)) return pick(responses.goodbye);
    if (m.includes("?") || /\b(what|how|why|when|who|where)\b/.test(m))
      return pick(responses.questions);
    return pick(responses.general);
  }

  isAvailable() {
    return this.client !== null && this.isValidated;
  }

  getStatus() {
    const available = this.isAvailable();
    return {
      provider: config.llm.providerLabel,
      available,
      model: available ? config.llm.defaultModel : "fallback",
      models: config.llm.models,
      defaultModel: config.llm.defaultModel,
      apiKeyConfigured: !!this.apiKey,
      validated: this.isValidated,
      initializationAttempted: this.initializationAttempted,
    };
  }
}

const llmService = new LLMService();

export default llmService;
