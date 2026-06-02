// Server entrypoint (container / local / Render).
//
// Importing config first ensures the environment is parsed and validated before
// anything else runs. This entrypoint owns the long-running concerns: connecting
// the DB up front, serving the built SPA in production, listening on a port, and
// draining cleanly on shutdown (SIGTERM from Render / Docker / Ctrl-C).
import { config, printConfigDiagnostics } from "./config/index.js";
import { logger } from "./lib/logger.js";

import { createApp } from "./app.js";
import { connectDB, closeDB } from "./lib/db.js";

// In production the backend also serves the built React SPA (combined
// single-origin image). In development the SPA is served by the Vite dev server.
const app = createApp({ serveStaticSpa: config.isProduction });

// ---------------------------------------------------------------------------
// Startup & graceful shutdown.
//
// Connect to MongoDB BEFORE accepting traffic, then start listening. On SIGTERM
// / SIGINT (Docker stop, orchestrator rollout, Ctrl-C) stop accepting new
// connections, drain in-flight ones, close the DB connection, then exit — with
// a hard timeout so a stuck connection can never hang the shutdown forever.
// ---------------------------------------------------------------------------
async function start() {
  await connectDB();

  const server = app.listen(config.port, () => {
    printConfigDiagnostics();
    logger.info(`Server running on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down gracefully`);

    server.close(async () => {
      await closeDB();
      logger.info("Shutdown complete");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Could not close connections in time — forcing exit");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((err) => {
  logger.error("Fatal startup error:", err);
  process.exit(1);
});
