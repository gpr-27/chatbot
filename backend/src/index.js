import path from "path";

// config/index.js is the single module that loads & validates the environment.
// Importing it first ensures env is parsed and validated before anything else
// runs, and that no other module ever touches process.env.
import { config, printConfigDiagnostics } from "./config/index.js";
import { logger } from "./lib/logger.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";

import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";

import { connectDB } from "./lib/db.js";
const app = express();

const __dirname = path.resolve();

// CORS — always allow the configured client origin. In development, also allow
// any localhost / 127.0.0.1 port, because the Vite dev server shifts ports when
// several projects run at once; without this, a port mismatch silently blocks
// every /api call and the UI drops to "Basic mode". Production stays strict.
const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

const corsOrigin = (origin, callback) => {
  // No Origin header (same-origin nav, curl, native apps) — allow.
  if (!origin) return callback(null, true);
  if (origin === config.clientUrl) return callback(null, true);
  if (config.isDevelopment && isLocalhostOrigin(origin)) return callback(null, true);
  logger.warn(`CORS blocked origin: ${origin}`);
  return callback(null, false);
};

logger.info(
  `CORS allowing ${config.clientUrl}${config.isDevelopment ? " + any localhost (dev)" : ""}`
);
app.use(cors({ origin: corsOrigin, credentials: true }));

app.use(express.json());
app.use(cookieParser());
app.use(clerkMiddleware({
  publishableKey: config.clerk.publishableKey,
  secretKey: config.clerk.secretKey
}));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString()
  });
});

if (config.isProduction) {
  app.use(express.static(path.join(__dirname, "frontend", "dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
  });
}

app.listen(config.port, () => {
  printConfigDiagnostics();
  connectDB();
  logger.info(`Server running on port ${config.port}`);
});
