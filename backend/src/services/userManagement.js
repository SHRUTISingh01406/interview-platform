import { PlatformUser } from "../models/PlatformUser.js";

export const UserManagement = {
  /**
   * Syncs user details from Clerk webhook payload to local DB
   * @param {Object} userData - Extract from webhook (id, email_addresses, first_name, last_name, image_url)
   */
  syncUser: async (userData) => {
    try {
      const { id: clerkId, email_addresses, first_name, last_name, image_url } = userData;
      const primaryEmail = email_addresses?.length > 0 ? email_addresses[0].email_address : "";

      const userPayload = {
        clerkId,
        email: primaryEmail,
        firstName: first_name || "",
        lastName: last_name || "",
        profileImageUrl: image_url || "",
      };

      // Upsert the user: Create if not exists, update if exists
      const updatedUser = await PlatformUser.findOneAndUpdate(
        { clerkId },
        { $set: userPayload },
        { new: true, upsert: true }
      );

      return updatedUser;
    } catch (error) {
      console.error("Failed to sync PlatformUser:", error.message);
      throw error;
    }
  },

  /**
   * Deletes a user when webhook signals clerk user deletion
   * @param {string} clerkId - The Clerk ID of the deleted user
   */
  deleteUser: async (clerkId) => {
    try {
      await PlatformUser.findOneAndDelete({ clerkId });
      console.log(`PlatformUser ${clerkId} deleted successfully.`);
    } catch (error) {
      console.error("Failed to delete PlatformUser.", error.message);
      throw error;
    }
  }
};
