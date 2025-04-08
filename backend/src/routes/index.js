const express = require("express");
const { getNonce } = require("../services/blockchain");
const { pgPool } = require("../config/database");
const { authMiddleware } = require("../middleware/auth");
const socialAccountService = require("../services/socialAccountService");

const setupRoutes = (app) => {
  const router = express.Router();

  // Get nonce for wallet authentication
  router.get("/auth/nonce", async (req, res) => {
    try {
      const nonce = getNonce();
      res.json({ nonce });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate nonce" });
    }
  });

  // Public routes
  router.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Protected routes
  router.get("/user/:address", authMiddleware, async (req, res) => {
    try {
      const { address } = req.params;
      const result = await pgPool.query(
        "SELECT id, wallet_address, username, created_at FROM users WHERE wallet_address = $1",
        [address]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Social account routes
  router.get("/user/social-accounts", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const accounts = await socialAccountService.getUserSocialAccounts(userId);
      res.json(accounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch social accounts" });
    }
  });

  router.post(
    "/user/social-accounts/:platform/verify",
    authMiddleware,
    async (req, res) => {
      try {
        const userId = req.user.id;
        const { platform } = req.params;

        if (!["twitter", "farcaster", "tiktok"].includes(platform)) {
          return res.status(400).json({ error: "Invalid platform" });
        }

        const verificationData =
          await socialAccountService.createVerificationRequest(
            userId,
            platform
          );
        res.json(verificationData);
      } catch (error) {
        res
          .status(500)
          .json({ error: "Failed to create verification request" });
      }
    }
  );

  router.post(
    "/user/social-accounts/:platform/confirm",
    authMiddleware,
    async (req, res) => {
      try {
        const userId = req.user.id;
        const { platform } = req.params;
        const { platformUserId, username, profileUrl } = req.body;

        if (!platformUserId || !username) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const result = await socialAccountService.verifyAccount(
          userId,
          platform,
          platformUserId,
          username,
          profileUrl || ""
        );

        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to confirm verification" });
      }
    }
  );

  router.delete(
    "/user/social-accounts/:id",
    authMiddleware,
    async (req, res) => {
      try {
        const userId = req.user.id;
        const accountId = req.params.id;

        const result = await socialAccountService.deleteSocialAccount(
          userId,
          accountId
        );
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: "Failed to delete social account" });
      }
    }
  );

  // Game-related routes (protected)
  router.post("/game/create", authMiddleware, async (req, res) => {
    try {
      // Game creation logic
      res.json({ message: "Game created successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to create game" });
    }
  });

  router.post("/game/join/:gameId", authMiddleware, async (req, res) => {
    try {
      // Game joining logic
      res.json({ message: "Joined game successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to join game" });
    }
  });

  app.use("/api", router);
};

module.exports = {
  setupRoutes,
};
