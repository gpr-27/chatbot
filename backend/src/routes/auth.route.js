import express from "express";
import { createGuest, getGuest, upgradeGuest } from "../controllers/guest.controller.js";

const router = express.Router();

// Anonymous guest sessions (no Clerk account required).
router.post("/guest", createGuest); // create a new guest
router.get("/guest", getGuest); // restore an existing guest (X-Guest-Id header)
router.post("/guest/upgrade", upgradeGuest); // migrate guest → signed-in Clerk user

export default router;
