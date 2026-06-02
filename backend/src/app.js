import path from "path";
import { fileURLToPath } from "url";

// config/index.js is the single module that loads & validates the environment.
// Importing it here ensures env is parsed and validated before the app is built,
// and that no other module ever touches process.env.
import { config } from "./config/index.js";
import { logger } from "./lib/logger.js";

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { clerkMiddleware } from "@clerk/express";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";

// Path to the built frontend, resolved relative to THIS module (not the cwd) so
// it works whether the process is launched from the repo root, the backend dir,
// or inside the container. app.js lives at backend/src/; the repo root is two
// levels up and Vite builds to frontend/dist.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIST = path.resolve(__dirname, "..", "..", "frontend", "dist");

const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

/**
 * Build the configured Express application: security headers, CORS, body
 * parsing, Clerk auth, the JSON API routes, the /api 404, and the centralized
 * error handler.
 *
 * It deliberately does NOT call `listen`, connect to the database, or — unless
 * `serveStaticSpa` is true — serve the built SPA. Two callers consume it:
 *   • index.js (container / local): connects the DB, serves the SPA in
 *     production, and listens on a port.
 *   • api/index.mjs (Vercel): the platform serves the static SPA from the CDN
 *     and rewrites only /api/* to this app, which runs as a serverless function.
 */
export function createApp({ serveStaticSpa = false } = {}) {
  const app = express();

  // Hide the framework fingerprint; trust the platform proxy in production so
  // secure cookies and client IPs are handled correctly behind a load balancer.
  app.disable("x-powered-by");
  if (config.isProduction) app.set("trust proxy", 1);

  // Security headers. CSP is disabled because the SPA loads Clerk and Google
  // Fonts and talks to the provider-backed API; a tailored Content-Security-
  // Policy is a follow-up. The other helmet protections (HSTS, no-sniff,
  // frame-deny…) stay on.
  app.use(helmet({ contentSecurityPolicy: false }));

  // gzip responses. Never compress Server-Sent Events — buffering breaks the
  // token-by-token stream. The stream also sends `Cache-Control: no-transform`
  // (which compression already honours); this filter is belt-and-suspenders.
  const shouldCompress = (req, res) => {
    const type = String(res.getHeader("Content-Type") || "");
    if (type.includes("text/event-stream")) return false;
    return compression.filter(req, res);
  };
  app.use(compression({ filter: shouldCompress }));

  // CORS — always allow the configured client origin. In development, also allow
  // any localhost / 127.0.0.1 port, because the Vite dev server shifts ports when
  // several projects run at once; without this, a port mismatch silently blocks
  // every /api call and the UI drops to "Basic mode". Production stays strict.
  // (On the combined Vercel/Docker deploy the SPA and API share one origin, so
  // the browser never even runs a CORS check.)
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

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(clerkMiddleware({
    publishableKey: config.clerk.publishableKey,
    secretKey: config.clerk.secretKey
  }));

  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/chat", chatRoutes);

  // Health check — liveness probe for container orchestrators; also reports the
  // current database connection state for observability.
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Server is running successfully",
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      timestamp: new Date().toISOString()
    });
  });

  // Any unmatched /api/* path gets a JSON 404 — never the SPA fallback below.
  app.use("/api", (req, res) => {
    res.status(404).json({
      success: false,
      message: `Route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // In the combined container/local deploy, serve the built SPA. Fingerprinted
  // assets are immutable, so cache them hard; index.html is served by the
  // fallback with no long cache so new deploys are picked up immediately.
  // On Vercel this stays OFF — the platform serves the SPA from its CDN.
  if (serveStaticSpa) {
    app.use(express.static(FRONTEND_DIST, { maxAge: "1y", index: false }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(FRONTEND_DIST, "index.html"));
    });
  }

  // Centralized error handler — log it, and never leak internals in production.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error("Unhandled error:", err);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({
      success: false,
      message: config.isProduction
        ? "Internal server error"
        : err.message || "Internal server error"
    });
  });

  return app;
}
