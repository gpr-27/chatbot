import { getAuth } from "@clerk/express";
import Guest from "../models/guest.model.js";
import { logger } from "../lib/logger.js";

// Accepts EITHER a Clerk session OR an anonymous guest session, and normalises
// both to `req.user = { id, isGuest }` so downstream controllers (which key data
// by req.user.id) work unchanged for both kinds of user.
export const protectRoute = async (req, res, next) => {
  // 1) Clerk session takes precedence.
  const { isAuthenticated, userId } = getAuth(req);
  if (isAuthenticated && userId) {
    req.user = { id: userId, isGuest: false };
    return next();
  }

  // 2) Fall back to a guest capability id (X-Guest-Id). The id is an unguessable
  //    UUID; we still verify the record exists so revoked/expired ids are denied.
  const guestId = req.get("X-Guest-Id");
  if (guestId) {
    try {
      const guest = await Guest.findOne({ guestId });
      if (guest) {
        guest.lastActiveAt = new Date(); // keep the session alive (defers TTL)
        await guest.save();
        req.user = { id: guest.guestId, isGuest: true };
        return next();
      }
    } catch (error) {
      logger.error("Guest auth lookup failed:", error.message);
    }
  }

  logger.warn("Unauthorized request — no Clerk session or valid guest");
  return res.status(401).json({ message: "Unauthorized" });
};
