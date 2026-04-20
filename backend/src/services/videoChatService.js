import { StreamClient } from "@stream-io/node-sdk";
import { ENV } from "../lib/env.js";

// Initialize the Stream Client internally
let streamClientInstance = null;

const getStreamClient = () => {
  if (!streamClientInstance) {
    if (!ENV.STREAM_API_KEY || !ENV.STREAM_API_SECRET) {
      throw new Error("Stream API keys are missing. Check environment variables.");
    }
    streamClientInstance = new StreamClient(
      ENV.STREAM_API_KEY,
      ENV.STREAM_API_SECRET
    );
  }
  return streamClientInstance;
};

export const VideoChatService = {
  /**
   * Generates a token for a given user to connect to Stream Video and Chat
   * @param {string} userId - The unique identifier of the user (clerkId)
   * @returns {string} The JWT token
   */
  generateUserToken: (userId) => {
    try {
      const client = getStreamClient();
      // Tokens are typically valid for a certain duration. Defaulting to 1 hour here for standard interviews.
      const validityInSeconds = 60 * 60; 
      const exp = Math.round(new Date().getTime() / 1000) + validityInSeconds;
      return client.generateUserToken({ user_id: userId, validity_in_seconds: validityInSeconds });
    } catch (error) {
      console.error("Error generating Stream user token:", error.message);
      throw error;
    }
  },

  /**
   * Helper to verify if Stream is configured properly
   */
  isConfigured: () => {
    return Boolean(ENV.STREAM_API_KEY && ENV.STREAM_API_SECRET);
  }
};
