const { pgPool } = require("../config/database");
const crypto = require("crypto");

/**
 * Creates a verification request for a social media account
 */
const createVerificationRequest = async (userId, platform) => {
  const verificationToken = crypto.randomBytes(24).toString("hex");

  try {
    // Check if there is an existing account for this user and platform
    const existingAccount = await pgPool.query(
      "SELECT id FROM social_accounts WHERE user_id = $1 AND platform = $2",
      [userId, platform]
    );

    if (existingAccount.rows.length > 0) {
      // Update existing account with new verification token
      await pgPool.query(
        `UPDATE social_accounts 
         SET verification_token = $1, verified = false, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $2 AND platform = $3`,
        [verificationToken, userId, platform]
      );
      return { accountId: existingAccount.rows[0].id, verificationToken };
    }

    // Create new social account entry
    const result = await pgPool.query(
      `INSERT INTO social_accounts 
       (user_id, platform, platform_user_id, verification_token) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id`,
      [userId, platform, "", verificationToken]
    );

    return { accountId: result.rows[0].id, verificationToken };
  } catch (error) {
    console.error("Error creating verification request:", error);
    throw new Error("Failed to create verification request");
  }
};

/**
 * Verifies a social media account after successful authentication
 */
const verifyAccount = async (
  userId,
  platform,
  platformUserId,
  username,
  profileUrl
) => {
  try {
    const result = await pgPool.query(
      `UPDATE social_accounts 
       SET platform_user_id = $1, 
           username = $2, 
           profile_url = $3, 
           verified = true, 
           verification_date = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $4 AND platform = $5 
       RETURNING id`,
      [platformUserId, username, profileUrl, userId, platform]
    );

    if (result.rows.length === 0) {
      throw new Error("Social account not found");
    }

    return { success: true, accountId: result.rows[0].id };
  } catch (error) {
    console.error("Error verifying account:", error);
    throw new Error("Failed to verify account");
  }
};

/**
 * Gets all verified social accounts for a user
 */
const getUserSocialAccounts = async (userId) => {
  try {
    const result = await pgPool.query(
      `SELECT id, platform, platform_user_id, username, profile_url, verified, 
              verification_date, created_at, updated_at 
       FROM social_accounts 
       WHERE user_id = $1 
       ORDER BY platform ASC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    console.error("Error fetching user social accounts:", error);
    throw new Error("Failed to fetch user social accounts");
  }
};

/**
 * Deletes a social account
 */
const deleteSocialAccount = async (userId, accountId) => {
  try {
    const result = await pgPool.query(
      "DELETE FROM social_accounts WHERE id = $1 AND user_id = $2 RETURNING id",
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error(
        "Social account not found or you do not have permission to delete it"
      );
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting social account:", error);
    throw new Error("Failed to delete social account");
  }
};

module.exports = {
  createVerificationRequest,
  verifyAccount,
  getUserSocialAccounts,
  deleteSocialAccount,
};
