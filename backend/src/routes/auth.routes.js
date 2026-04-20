import express from "express";
import { clerkWebhookHandler } from "../controllers/auth.controller.js";

const router = express.Router();

// The endpoint that Clerk will call when a user uses the signup/login flow
router.post("/clerk-webhook", clerkWebhookHandler);

export default router;
