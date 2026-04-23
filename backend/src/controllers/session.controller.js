import { InterviewEvent } from "../models/InterviewEvent.js";
import { VideoChatService } from "../services/videoChatService.js";
import { PlatformUser } from "../models/PlatformUser.js";
import { createClerkClient } from "@clerk/express";
import { ENV } from "../lib/env.js";

const clerkClient = createClerkClient({ secretKey: ENV.CLERK_SECRET_KEY });

// Helper to enrich session with user data from PlatformUser
const enrichSession = async (session) => {
  let host = await PlatformUser.findOne({ clerkId: session.host });
  
  // Lazy sync host if missing
  if (!host && session.host) {
    try {
      const clerkUser = await clerkClient.users.getUser(session.host);
      if (clerkUser) {
        host = await PlatformUser.findOneAndUpdate(
          { clerkId: session.host },
          {
            $set: {
              clerkId: session.host,
              email: clerkUser.emailAddresses[0]?.emailAddress || "",
              firstName: clerkUser.firstName || "",
              lastName: clerkUser.lastName || "",
              profileImageUrl: clerkUser.imageUrl || "",
            },
          },
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      console.error("Lazy sync host failed:", e.message);
    }
  }

  let participant = session.participant
    ? await PlatformUser.findOne({ clerkId: session.participant })
    : null;

  // Lazy sync participant if missing
  if (!participant && session.participant) {
    try {
      const clerkUser = await clerkClient.users.getUser(session.participant);
      if (clerkUser) {
        participant = await PlatformUser.findOneAndUpdate(
          { clerkId: session.participant },
          {
            $set: {
              clerkId: session.participant,
              email: clerkUser.emailAddresses[0]?.emailAddress || "",
              firstName: clerkUser.firstName || "",
              lastName: clerkUser.lastName || "",
              profileImageUrl: clerkUser.imageUrl || "",
            },
          },
          { upsert: true, new: true }
        );
      }
    } catch (e) {
      console.error("Lazy sync participant failed:", e.message);
    }
  }

  return {
    ...session.toObject(),
    callId: session.streamCallId, // Alias for frontend
    host: host
      ? {
          clerkId: host.clerkId,
          name: `${host.firstName} ${host.lastName}`.trim() || "User",
          image: host.profileImageUrl,
        }
      : { clerkId: session.host, name: "Host", image: "" },
    participant: participant
      ? {
          clerkId: participant.clerkId,
          name: `${participant.firstName} ${participant.lastName}`.trim() || "User",
          image: participant.profileImageUrl,
        }
      : session.participant ? { clerkId: session.participant, name: "Participant", image: "" } : null,
  };
};

export const createSession = async (req, res) => {
  try {
    const { problem, difficulty } = req.body;
    const hostId = req.auth?.userId;

    if (!hostId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!problem || !difficulty) {
      return res.status(400).json({ success: false, message: "Problem and difficulty are required" });
    }

    const streamCallId = `${hostId}-${Date.now()}`;

    const newSession = await InterviewEvent.create({
      problem,
      difficulty,
      host: hostId,
      streamCallId,
      status: "active",
    });

    res.status(201).json({ success: true, session: newSession });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ success: false, message: "Error creating session" });
  }
};

export const getActiveSessions = async (req, res) => {
  try {
    const sessions = await InterviewEvent.find({ status: "active" }).sort({ createdAt: -1 });
    const enrichedSessions = await Promise.all(sessions.map(enrichSession));

    res.status(200).json({ success: true, sessions: enrichedSessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching active sessions" });
  }
};

export const getMyRecentSessions = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const sessions = await InterviewEvent.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    }).sort({ updatedAt: -1 });

    const enrichedSessions = await Promise.all(sessions.map(enrichSession));

    res.status(200).json({ success: true, sessions: enrichedSessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching recent sessions" });
  }
};

export const getSessionById = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await InterviewEvent.findById(id);

    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    const enrichedSession = await enrichSession(session);
    res.status(200).json({ success: true, session: enrichedSession });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching session" });
  }
};

export const joinSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;

    const session = await InterviewEvent.findById(id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    if (session.host === userId) {
      return res.status(200).json({ success: true, message: "Host joining own session" });
    }

    if (session.participant && session.participant !== userId) {
      return res.status(400).json({ success: false, message: "Session is already full" });
    }

    session.participant = userId;
    await session.save();

    res.status(200).json({ success: true, message: "Joined session successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error joining session" });
  }
};

export const endSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.auth?.userId;

    const session = await InterviewEvent.findById(id);
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });

    if (session.host !== userId) {
      return res.status(403).json({ success: false, message: "Only host can end session" });
    }

    session.status = "completed";
    await session.save();

    res.status(200).json({ success: true, message: "Session ended" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error ending session" });
  }
};

export const generateStreamToken = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!VideoChatService.isConfigured()) {
      return res.status(500).json({ success: false, message: "Stream Video Chat is not configured properly." });
    }

    let user = await PlatformUser.findOne({ clerkId: userId });

    // Lazy sync user if missing
    if (!user) {
      try {
        const clerkUser = await clerkClient.users.getUser(userId);
        if (clerkUser) {
          user = await PlatformUser.findOneAndUpdate(
            { clerkId: userId },
            {
              $set: {
                clerkId: userId,
                email: clerkUser.emailAddresses[0]?.emailAddress || "",
                firstName: clerkUser.firstName || "",
                lastName: clerkUser.lastName || "",
                profileImageUrl: clerkUser.imageUrl || "",
              },
            },
            { upsert: true, new: true }
          );
        }
      } catch (e) {
        console.error("Lazy sync user failed in token generation:", e.message);
      }
    }

    if (!user) return res.status(404).json({ success: false, message: "User profile not found." });

    const token = VideoChatService.generateUserToken(userId);
    res.status(200).json({
      success: true,
      token,
      userId: user.clerkId,
      userName: `${user.firstName} ${user.lastName}`.trim() || "User",
      userImage: user.profileImageUrl,
    });
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ success: false, message: "Could not generate video access token." });
  }
};
