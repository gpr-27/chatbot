import mongoose from "mongoose";
import { config } from "../config/index.js";
import { logger } from "./logger.js";

// Bind connection lifecycle listeners exactly once so transient drops/reconnects
// during the process lifetime are surfaced in the logs.
let listenersBound = false;
function bindConnectionListeners() {
  if (listenersBound) return;
  listenersBound = true;
  mongoose.connection.on("error", (err) => logger.error("MongoDB error:", err));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));
}

// Connect to MongoDB. Throws on failure so the caller (server startup) can decide
// to abort — we no longer exit the process from inside this helper.
export const connectDB = async () => {
  bindConnectionListeners();
  const conn = await mongoose.connect(config.mongoUri);
  logger.info(`MongoDB Connected ✓ (${conn.connection.host})`);
  return conn;
};

// ---------------------------------------------------------------------------
// Serverless-friendly cached connection (used by the Vercel function).
//
// On Vercel each function invocation re-evaluates the module, but a warm
// container keeps `global` between invocations. Caching the connection promise
// there means we open ONE MongoDB connection per warm instance and reuse it for
// every subsequent request — avoiding the connection storm that a fresh
// `mongoose.connect()` per request would cause. The first call awaits the
// connection; later calls return the live one immediately.
// ---------------------------------------------------------------------------
let cached = global.__groqbotMongoose;
if (!cached) cached = global.__groqbotMongoose = { conn: null, promise: null };

export const ensureDB = async () => {
  bindConnectionListeners();

  // Reuse a live connection.
  if (cached.conn && mongoose.connection.readyState === 1) return cached.conn;

  // Otherwise connect once and share the in-flight promise across concurrent
  // requests racing the same cold start.
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(config.mongoUri, { bufferCommands: false })
      .then((m) => {
        logger.info(`MongoDB Connected ✓ (${m.connection.host})`);
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Let the next request retry from scratch instead of caching a rejection.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
};

// Close the connection cleanly during graceful shutdown.
export const closeDB = async () => {
  try {
    await mongoose.connection.close(false);
    logger.info("MongoDB connection closed");
  } catch (err) {
    logger.error("Error closing MongoDB connection:", err);
  }
};
