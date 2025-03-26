const express = require('express');
const { getNonce } = require('../services/blockchain');
const { pgPool } = require('../config/database');

const setupRoutes = (app) => {
  const router = express.Router();

  // Get nonce for wallet authentication
  router.get('/auth/nonce', async (req, res) => {
    try {
      const nonce = getNonce();
      res.json({ nonce });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate nonce' });
    }
  });

  // Get user profile
  router.get('/user/:address', async (req, res) => {
    try {
      const { address } = req.params;
      const result = await pgPool.query(
        'SELECT id, wallet_address, username, created_at FROM users WHERE wallet_address = $1',
        [address]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  });

  // Health check endpoint
  router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', router);
};

module.exports = {
  setupRoutes
}; 