import { v4 as uuidv4 } from "uuid";
import { getAuth } from "@clerk/express";
import Guest from "../models/guest.model.js";
import Chat from "../models/chat.model.js";
import { logger } from "../lib/logger.js";

const toGuestDTO = (g) => ({
  guestId: g.guestId,
  isGuest: true,
  displayName: g.displayName,
  createdAt: g.createdAt,
  lastActiveAt: g.lastActiveAt,
});

// POST /api/auth/guest — create a fresh anonymous guest (no auth required).
export const createGuest = async (_req, res) => {
  try {
    const guest = await Guest.create({ guestId: `guest_${uuidv4()}` });
    logger.info(`Guest created: ${guest.guestId}`);
    res.status(201).json(toGuestDTO(guest));
  } catch (error) {
    logger.error("Error in createGuest:", error.message);
    res.status(500).json({ message: "Could not create guest session" });
  }
};

// GET /api/auth/guest — restore an existing guest from its X-Guest-Id header.
export const getGuest = async (req, res) => {
  try {
    const guestId = req.get("X-Guest-Id");
    if (!guestId) return res.status(400).json({ message: "Missing guest id" });

    const guest = await Guest.findOne({ guestId });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    guest.lastActiveAt = new Date();
    await guest.save();
    res.status(200).json(toGuestDTO(guest));
  } catch (error) {
    logger.error("Error in getGuest:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// POST /api/auth/guest/upgrade — migrate a guest's data to the now-authenticated
// Clerk user, then delete the guest record. Requires BOTH a valid Clerk session
// (the destination account) and the guest's X-Guest-Id (proof of ownership).
export const upgradeGuest = async (req, res) => {
  try {
    const { isAuthenticated, userId } = getAuth(req);
    if (!isAuthenticated || !userId) {
      return res.status(401).json({ message: "Sign in required to upgrade a guest" });
    }

    const guestId = req.get("X-Guest-Id") || req.body?.guestId;
    if (!guestId) return res.status(400).json({ message: "Missing guest id" });

    const guest = await Guest.findOne({ guestId });
    if (!guest) {
      // Nothing to migrate (already upgraded or expired) — treat as success.
      return res.status(200).json({ migrated: 0, userId, note: "no guest record" });
    }

    // Re-key every chat owned by the guest to the Clerk user id.
    const result = await Chat.updateMany({ userId: guestId }, { $set: { userId } });
    await Guest.deleteOne({ guestId });

    logger.info(
      `Guest ${guestId} upgraded → ${userId}; migrated ${result.modifiedCount} chat(s)`
    );
    res.status(200).json({ migrated: result.modifiedCount, userId });
  } catch (error) {
    logger.error("Error in upgradeGuest:", error.message);
    res.status(500).json({ message: "Guest migration failed" });
  }
};
