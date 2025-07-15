import dotenv from "dotenv";

// Load environment variables FIRST before any other imports
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import authRoutes from "./routes/auth.route.js";
import chatRoutes from "./routes/chat.route.js";

import { connectDB } from "./lib/db.js";
const app = express();

const PORT=process.env.PORT || 5001;

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

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

app.listen(PORT, () => {
  console.log("Server is running on port:"+PORT);
  connectDB();
});