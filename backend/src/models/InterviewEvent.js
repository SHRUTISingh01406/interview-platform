import mongoose from "mongoose";

const interviewEventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    // The user who created/organized the interview
    organizerId: {
      type: String,
      required: true, // Typically matches the clerkId of the organizer
      index: true,
    },
    // Stream video call ID generated for this session
    streamCallId: {
      type: String,
      required: true,
      unique: true,
    },
    scheduledAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["SCHEDULED", "LIVE", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
    participants: {
      // List of candidate clerkIds allowed to join this interview
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

export const InterviewEvent = mongoose.model("InterviewEvent", interviewEventSchema);
