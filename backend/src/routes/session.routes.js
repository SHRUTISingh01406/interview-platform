import express from "express";
import { requireAuth } from "@clerk/express";
import {
  createSession,
  getActiveSessions,
  getMyRecentSessions,
  getSessionById,
  joinSession,
  endSession,
  generateStreamToken,
} from "../controllers/session.controller.js";

const router = express.Router();

// Get the video stream token for the user connecting
router.get("/video-token", requireAuth(), generateStreamToken);

// Session management
router.post("/", requireAuth(), createSession);
router.get("/active", requireAuth(), getActiveSessions);
router.get("/my-recent", requireAuth(), getMyRecentSessions);
router.get("/:id", requireAuth(), getSessionById);
router.post("/:id/join", requireAuth(), joinSession);
router.post("/:id/end", requireAuth(), endSession);

export default router;
