// Vercel serverless entrypoint.
//
// On Vercel the built React SPA is served straight from the CDN; only requests
// matching /api/* are rewritten to this function (see vercel.json). Each request
// first ensures a (cached, reused) MongoDB connection, then is handed to the
// same Express app the container/local server uses — so all routing, auth,
// validation and SSE streaming behave identically across both deploy targets.
import { createApp } from "../backend/src/app.js";
import { ensureDB } from "../backend/src/lib/db.js";

// Build the app once per warm instance. Static SPA serving stays OFF — Vercel's
// CDN owns that; this function only answers the API.
const app = createApp({ serveStaticSpa: false });

export default async function handler(req, res) {
  try {
    await ensureDB();
  } catch (err) {
    // Connection failed at cold start — fail the request cleanly rather than
    // letting Mongoose buffer commands against a dead connection.
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({ success: false, message: "Database temporarily unavailable" })
    );
    return;
  }
  return app(req, res);
}
