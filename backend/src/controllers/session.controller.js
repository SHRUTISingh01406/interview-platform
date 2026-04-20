import { InterviewEvent } from "../models/InterviewEvent.js";
import { VideoChatService } from "../services/videoChatService.js";

export const createSession = async (req, res) => {
  try {
    const { title, description, scheduledAt, participants } = req.body;
    
    // Auth context provided by clerk middleware. 
    // In typical setup, `req.auth.userId` contains the logged-in clerk user ID.
    const organizerId = req.auth?.userId; 

    if (!organizerId) {
       return res.status(401).json({ success: false, message: "Unauthorized. Please log in first." });
    }

    if (!title || !scheduledAt) {
      return res.status(400).json({ success: false, message: "Title and scheduled time are required." });
    }

    // Creating a unique stream call ID
    const streamCallId = `${organizerId}-${Date.now()}`;

    const newSession = await InterviewEvent.create({
      title,
      description,
      organizerId,
      streamCallId,
      scheduledAt,
      participants: participants || [],
    });

    res.status(201).json({ success: true, data: newSession });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ success: false, message: "Could not schedule interview session." });
  }
};

export const getMySessions = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    // Fetch sessions where user is organizer OR a listed participant
    const sessions = await InterviewEvent.find({
      $or: [{ organizerId: userId }, { participants: userId }],
    }).sort({ scheduledAt: 1 });

    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error fetching sessions" });
  }
};

export const generateStreamToken = async (req, res) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (!VideoChatService.isConfigured()) {
      return res.status(500).json({ success: false, message: "Stream Video Chat is not configured properly on the server." });
    }

    const token = VideoChatService.generateUserToken(userId);
    res.status(200).json({ success: true, token });
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ success: false, message: "Could not generate video access token." });
  }
};
