import express from "express";
import { requireAuth } from "@clerk/express";
import { createSession, getMySessions, generateStreamToken } from "../controllers/session.controller.js";

const router = express.Router();

// Generate the video stream token for the user connecting
router.get("/video-token", requireAuth(), generateStreamToken);

// Schedule a new session
router.post("/create", requireAuth(), createSession);

// Fetch upcoming sessions for current user
router.get("/my-sessions", requireAuth(), getMySessions);

export default router;
