import mongoose from "mongoose";
import { config } from "../config/index.js";

// Anonymous guest account. A `guest_<uuid>` id is the user's capability token —
// possession of it (sent as the X-Guest-Id header) grants access to that guest's
// data. Their chats live in the Chat collection keyed by userId === guestId, so
// no per-guest embedded arrays are needed here.
const guestSchema = new mongoose.Schema(
  {
    guestId: { type: String, required: true, unique: true },
    isGuest: { type: Boolean, default: true },
    displayName: { type: String, default: "Guest User" },
    // Client-side-style prefs that don't require an account (free-form).
    preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// TTL index: MongoDB deletes a guest whose lastActiveAt is older than the
// configured retention window. lastActiveAt is refreshed on every guest request,
// so active guests are never reaped.
guestSchema.index(
  { lastActiveAt: 1 },
  { expireAfterSeconds: config.guest.retentionDays * 24 * 60 * 60 }
);

const Guest = mongoose.model("Guest", guestSchema);

export default Guest;
