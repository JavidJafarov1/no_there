const { pgPool, redisClient } = require("../config/database");

class SocketService {
  constructor() {
    this.connectedUsers = new Map();
    this.lastUpdateTimes = new Map();
    this.activeSessions = new Map();
    this.UPDATE_RATE_LIMIT = 100; // Minimum time between updates in ms
    this.MAX_SPEED = 5; // Maximum speed a player can move per update
  }

  async addUser(socketId, userAddress, position = { x: 0, y: 0 }) {
    // Check if user already has an active session
    const existingSession = await this.findActiveSessionByWalletAddress(
      userAddress
    );

    if (existingSession) {
      // Handle duplicate session
      await this.expireSession(existingSession.id);
      console.log(`Expired previous session for wallet: ${userAddress}`);
    }

    // Create a new user record if it doesn't exist
    const user = await this.getOrCreateUser(userAddress);

    // Create a new session
    const sessionId = await this.createSession(user.id, socketId);

    // Add to connected users map
    this.connectedUsers.set(socketId, {
      id: socketId,
      userId: user.id,
      address: userAddress,
      position,
      lastUpdate: Date.now(),
      sessionId,
    });

    console.log(
      `User added: ${socketId}, Wallet: ${userAddress}, UserId: ${user.id}`
    );
    return { socketId, address: userAddress, position };
  }

  async getOrCreateUser(walletAddress) {
    try {
      // Check if user exists
      const existingUserResult = await pgPool.query(
        "SELECT * FROM users WHERE wallet_address = $1",
        [walletAddress]
      );

      if (existingUserResult.rows.length > 0) {
        // Update last login
        await pgPool.query(
          "UPDATE users SET last_login = NOW(), updated_at = NOW() WHERE id = $1",
          [existingUserResult.rows[0].id]
        );
        return existingUserResult.rows[0];
      }

      // Create new user
      const newUserResult = await pgPool.query(
        "INSERT INTO users (wallet_address, created_at, updated_at, last_login) VALUES ($1, NOW(), NOW(), NOW()) RETURNING *",
        [walletAddress]
      );

      return newUserResult.rows[0];
    } catch (error) {
      console.error("Error in getOrCreateUser:", error);
      throw error;
    }
  }

  async createSession(userId, socketId) {
    try {
      const result = await pgPool.query(
        "INSERT INTO sessions (user_id, socket_id, status, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id",
        [userId, socketId, "active"]
      );

      const sessionId = result.rows[0].id;
      this.activeSessions.set(sessionId, { userId, socketId });

      return sessionId;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  }

  async findActiveSessionByWalletAddress(walletAddress) {
    try {
      const result = await pgPool.query(
        `
        SELECT s.* 
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE u.wallet_address = $1 AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 1
      `,
        [walletAddress]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error("Error finding active session:", error);
      throw error;
    }
  }

  async expireSession(sessionId) {
    try {
      await pgPool.query(
        `UPDATE sessions SET status = 'expired', expired_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      this.activeSessions.delete(sessionId);
    } catch (error) {
      console.error("Error expiring session:", error);
      throw error;
    }
  }

  removeUser(socketId) {
    const userData = this.connectedUsers.get(socketId);
    if (userData) {
      this.expireSession(userData.sessionId).catch((err) => {
        console.error(`Error expiring session on disconnect: ${err.message}`);
      });

      // Update last position in database
      this.updateUserPosition(userData.userId, userData.position).catch(
        (err) => {
          console.error(`Error updating last position: ${err.message}`);
        }
      );

      this.connectedUsers.delete(socketId);
      this.lastUpdateTimes.delete(socketId);
      console.log(`User removed: ${socketId}`);
    }
  }

  async updateUserPosition(userId, position) {
    try {
      await pgPool.query(
        "UPDATE users SET last_position_x = $1, last_position_y = $2, updated_at = NOW() WHERE id = $3",
        [position.x, position.y, userId]
      );
    } catch (error) {
      console.error("Error updating user position:", error);
    }
  }

  validatePosition(position) {
    return (
      position &&
      typeof position.x === "number" &&
      typeof position.y === "number" &&
      !isNaN(position.x) &&
      !isNaN(position.y) &&
      position.x >= 0 &&
      position.y >= 0 &&
      position.x <= 1000 &&
      position.y <= 1000
    );
  }

  validateMovement(currentPosition, newPosition, lastUpdateTime) {
    // Check if movement is within allowed speed limits
    const now = Date.now();
    const timeDelta = now - lastUpdateTime;

    if (timeDelta < 20) {
      // Too frequent updates
      return false;
    }

    const distance = Math.sqrt(
      Math.pow(newPosition.x - currentPosition.x, 2) +
        Math.pow(newPosition.y - currentPosition.y, 2)
    );

    const speed = distance / (timeDelta / 1000);

    return speed <= this.MAX_SPEED;
  }

  updateUserMovement(socketId, newPosition) {
    const userData = this.connectedUsers.get(socketId);
    if (!userData) {
      return false;
    }

    const lastUpdate = this.lastUpdateTimes.get(socketId) || 0;
    const now = Date.now();

    // Rate limiting check
    if (now - lastUpdate < this.UPDATE_RATE_LIMIT) {
      return false;
    }

    // Position validation
    if (!this.validatePosition(newPosition)) {
      return false;
    }

    // Speed/movement validation
    if (!this.validateMovement(userData.position, newPosition, lastUpdate)) {
      return false;
    }

    // Update user data
    userData.position = newPosition;
    userData.lastUpdate = now;
    this.lastUpdateTimes.set(socketId, now);

    // Update position in database (don't await to avoid slowing down the response)
    this.updateUserPosition(userData.userId, newPosition).catch((err) => {
      console.error(`Error updating user position: ${err.message}`);
    });

    return true;
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.values()).map((user) => ({
      id: user.id,
      address: user.address,
      position: user.position,
    }));
  }

  getUser(socketId) {
    return this.connectedUsers.get(socketId);
  }

  async cleanupStaleConnections() {
    const now = Date.now();
    const STALE_TIMEOUT = 30000; // 30 seconds

    const staleConnections = [];

    for (const [socketId, userData] of this.connectedUsers.entries()) {
      if (now - userData.lastUpdate > STALE_TIMEOUT) {
        staleConnections.push(socketId);
      }
    }

    // Remove stale connections
    for (const socketId of staleConnections) {
      this.removeUser(socketId);
    }

    return staleConnections;
  }
}

module.exports = SocketService;
