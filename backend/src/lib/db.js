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

// Close the connection cleanly during graceful shutdown.
export const closeDB = async () => {
  try {
    await mongoose.connection.close(false);
    logger.info("MongoDB connection closed");
  } catch (err) {
    logger.error("Error closing MongoDB connection:", err);
  }
};
