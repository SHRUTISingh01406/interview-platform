import express from "express";
import cors from "cors";

import { ENV } from "./lib/env.js";
import { connectDB } from "./lib/db.js";

import { clerkMiddleware } from "@clerk/express";

import authRoutes from "./routes/auth.routes.js";
import sessionRoutes from "./routes/session.routes.js";

const app = express();

app.use(cors({ origin: ENV.CLIENT_URL, credentials: true }));

// Enable Clerk Middleware globally so req.auth gets populated when token is provided
app.use(clerkMiddleware());

// Use express.json globally except for webhooks that might need raw body parsing
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ msg: "api is up and running" });
});

// Setup Mount Points for customized newly developed functionality
app.use("/api/auth", authRoutes);
app.use("/api/sessions", sessionRoutes);

// Global Error Handler for professional architecture abstraction
app.use((err, req, res, next) => {
  console.error("Unhandled Global Error:", err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(ENV.PORT, () => console.log("Server is running on port:", ENV.PORT));
  } catch (error) {
    console.error("?? Error starting the server", error);
  }
};

startServer();
