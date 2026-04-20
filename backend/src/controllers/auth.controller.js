import { UserManagement } from "../services/userManagement.js";

// Webhook payload from Clerk
export const clerkWebhookHandler = async (req, res) => {
  try {
    // Note: In an actual production scenario, you should verify the webhook signature here using `svix` or Clerk helpers.
    const { data, type } = req.body;

    if (!data || !type) {
      return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    if (type === "user.created" || type === "user.updated") {
      await UserManagement.syncUser(data);
      return res.status(200).json({ success: true, message: "User synced successfully." });
    }

    if (type === "user.deleted") {
      await UserManagement.deleteUser(data.id);
      return res.status(200).json({ success: true, message: "User deleted successfully." });
    }

    // Default fallback
    return res.status(200).json({ success: true, message: "Webhook received but not processed." });
  } catch (error) {
    console.error("Webhook processing error:", error.message);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
};
