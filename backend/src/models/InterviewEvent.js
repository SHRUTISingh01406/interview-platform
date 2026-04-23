import mongoose from "mongoose";

const interviewEventSchema = new mongoose.Schema(
  {
    // The problem being solved in this session
    problem: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      required: true,
    },
    // The user who created the session (clerkId)
    host: {
      type: String,
      required: true,
      index: true,
    },
    // The user who joined the session (clerkId)
    participant: {
      type: String,
      index: true,
      default: null,
    },
    // Stream video call ID generated for this session
    streamCallId: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const InterviewEvent = mongoose.model("InterviewEvent", interviewEventSchema);
