const { pgPool, redisClient } = require("../config/database");

/**
 * Service for managing game prizes
 */
class PrizeService {
  constructor() {
    this.activePrizes = new Map();
    this.PRIZE_CLAIM_DISTANCE = 50; // Distance within which a player can claim a prize
    this.PRIZE_TYPES = {
      COIN: "coin",
      POWER_UP: "powerup",
      TOKEN: "token",
    };
    this.REDIS_PRIZE_KEY = "active_prizes"; // Redis key for storing active prizes
    this.PRIZE_CACHE_TTL = 3600; // Cache TTL in seconds (1 hour)
  }

  /**
   * Initialize the prize service
   */
  async initialize() {
    try {
      // First check Redis cache for active prizes
      const cachedPrizes = await this.getCachedPrizes();

      if (cachedPrizes && cachedPrizes.length > 0) {
        // Load prizes from cache
        console.log(`Loading ${cachedPrizes.length} prizes from Redis cache`);
        for (const prize of cachedPrizes) {
          this.activePrizes.set(prize.id, prize);
        }
      } else {
        // Load active prizes from the database
        const activePrizes = await this.getActivePrizes();

        // Convert and cache prizes
        const prizesToCache = [];

        // Populate the active prizes map
        for (const prize of activePrizes) {
          const prizeData = {
            id: prize.id,
            position: {
              x: prize.position_x,
              y: prize.position_y,
            },
            type: prize.prize_type,
            value: prize.value,
            createdAt: prize.created_at,
            expiresAt: prize.expires_at,
          };

          this.activePrizes.set(prize.id, prizeData);
          prizesToCache.push(prizeData);
        }

        // Cache prizes in Redis
        if (prizesToCache.length > 0) {
          await this.cachePrizes(prizesToCache);
        }
      }

      console.log(`Loaded ${this.activePrizes.size} active prizes`);

      // Set up cleanup interval for expired prizes
      setInterval(() => this.cleanupExpiredPrizes(), 60000); // Check every minute
    } catch (error) {
      console.error("Error initializing prize service:", error);
      throw error;
    }
  }

  /**
   * Get cached prizes from Redis
   */
  async getCachedPrizes() {
    try {
      const cachedData = await redisClient.get(this.REDIS_PRIZE_KEY);
      if (cachedData) {
        return JSON.parse(cachedData);
      }
      return null;
    } catch (error) {
      console.error("Error getting cached prizes:", error);
      return null;
    }
  }

  /**
   * Cache prizes in Redis
   */
  async cachePrizes(prizes) {
    try {
      await redisClient.set(this.REDIS_PRIZE_KEY, JSON.stringify(prizes), {
        EX: this.PRIZE_CACHE_TTL,
      });
      console.log(`Cached ${prizes.length} prizes in Redis`);
    } catch (error) {
      console.error("Error caching prizes:", error);
    }
  }

  /**
   * Invalidate the prize cache
   */
  async invalidatePrizeCache() {
    try {
      await redisClient.del(this.REDIS_PRIZE_KEY);
    } catch (error) {
      console.error("Error invalidating prize cache:", error);
    }
  }

  /**
   * Get all active prizes from the database
   */
  async getActivePrizes() {
    try {
      const result = await pgPool.query(`
        SELECT * FROM prizes 
        WHERE status = 'active' 
        AND (expires_at IS NULL OR expires_at > NOW())
      `);

      return result.rows;
    } catch (error) {
      console.error("Error getting active prizes:", error);
      throw error;
    }
  }

  /**
   * Spawn a new prize at the specified position
   */
  async spawnPrize(type, value, position, expirationTime = null) {
    try {
      // Validate prize type
      if (!Object.values(this.PRIZE_TYPES).includes(type)) {
        throw new Error(`Invalid prize type: ${type}`);
      }

      // Validate position
      if (!this.validatePosition(position)) {
        throw new Error("Invalid prize position");
      }

      // Insert prize into database
      const result = await pgPool.query(
        `
        INSERT INTO prizes (
          position_x, position_y, prize_type, value, status, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6)
        RETURNING *
      `,
        [
          position.x,
          position.y,
          type,
          value,
          "active",
          expirationTime ? new Date(Date.now() + expirationTime) : null,
        ]
      );

      const newPrize = result.rows[0];

      // Add to active prizes map
      const prizeData = {
        id: newPrize.id,
        position: {
          x: newPrize.position_x,
          y: newPrize.position_y,
        },
        type: newPrize.prize_type,
        value: newPrize.value,
        createdAt: newPrize.created_at,
        expiresAt: newPrize.expires_at,
      };

      this.activePrizes.set(newPrize.id, prizeData);

      // Invalidate cache since we modified prizes
      await this.invalidatePrizeCache();

      console.log(
        `Spawned new prize: ID ${newPrize.id}, Type: ${type}, Value: ${value}, Position: (${position.x}, ${position.y})`
      );

      return prizeData;
    } catch (error) {
      console.error("Error spawning prize:", error);
      throw error;
    }
  }

  /**
   * Check if a player can claim a prize and process the claim if possible
   */
  async attemptPrizeClaim(userId, position) {
    const nearbyPrizes = this.findNearbyPrizes(position);

    if (nearbyPrizes.length === 0) {
      return null;
    }

    // Get the closest prize
    const closestPrize = nearbyPrizes[0];

    try {
      const claimed = await this.claimPrize(closestPrize.id, userId);
      return claimed ? closestPrize : null;
    } catch (error) {
      console.error(
        `Error claiming prize ${closestPrize.id} for user ${userId}:`,
        error
      );
      return null;
    }
  }

  /**
   * Find prizes near a position
   */
  findNearbyPrizes(position) {
    const nearbyPrizes = [];

    for (const [id, prize] of this.activePrizes.entries()) {
      const distance = Math.sqrt(
        Math.pow(prize.position.x - position.x, 2) +
          Math.pow(prize.position.y - position.y, 2)
      );

      if (distance <= this.PRIZE_CLAIM_DISTANCE) {
        nearbyPrizes.push({
          ...prize,
          distance,
        });
      }
    }

    // Sort by distance (closest first)
    return nearbyPrizes.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Claim a prize for a user
   */
  async claimPrize(prizeId, userId) {
    try {
      // Begin transaction
      await pgPool.query("BEGIN");

      // Check if prize is still active
      const prizeResult = await pgPool.query(
        "SELECT * FROM prizes WHERE id = $1 AND status = $2 FOR UPDATE",
        [prizeId, "active"]
      );

      if (prizeResult.rows.length === 0) {
        await pgPool.query("ROLLBACK");
        return false;
      }

      // Mark prize as claimed
      await pgPool.query(
        "UPDATE prizes SET status = $1, claimed_by = $2, claimed_at = NOW() WHERE id = $3",
        ["claimed", userId, prizeId]
      );

      // Add to user_prizes
      await pgPool.query(
        "INSERT INTO user_prizes (user_id, prize_id, claimed_at, status) VALUES ($1, $2, NOW(), $3)",
        [userId, prizeId, "claimed"]
      );

      // Commit transaction
      await pgPool.query("COMMIT");

      // Remove from active prizes map
      this.activePrizes.delete(prizeId);

      // Invalidate cache since we modified prizes
      await this.invalidatePrizeCache();

      console.log(`Prize ${prizeId} claimed by user ${userId}`);
      return true;
    } catch (error) {
      await pgPool.query("ROLLBACK");
      console.error("Error claiming prize:", error);
      throw error;
    }
  }

  /**
   * Validate a position is within the game boundaries
   */
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

  /**
   * Clean up expired prizes
   */
  async cleanupExpiredPrizes() {
    const now = new Date();
    const expiredPrizeIds = [];

    // Find expired prizes
    for (const [id, prize] of this.activePrizes.entries()) {
      if (prize.expiresAt && new Date(prize.expiresAt) <= now) {
        expiredPrizeIds.push(id);
      }
    }

    if (expiredPrizeIds.length === 0) {
      return;
    }

    try {
      // Update prize status in database
      await pgPool.query(
        `UPDATE prizes SET status = 'expired', updated_at = NOW() WHERE id = ANY($1)`,
        [expiredPrizeIds]
      );

      // Remove from active prizes map
      for (const id of expiredPrizeIds) {
        this.activePrizes.delete(id);
      }

      // Invalidate cache since we modified prizes
      await this.invalidatePrizeCache();

      console.log(`Expired ${expiredPrizeIds.length} prizes`);
    } catch (error) {
      console.error("Error cleaning up expired prizes:", error);
    }
  }

  /**
   * Get all active prizes
   */
  getAllActivePrizes() {
    return Array.from(this.activePrizes.values());
  }

  /**
   * Spawn random prizes in the game world
   */
  async spawnRandomPrizes(count = 5, minValue = 1, maxValue = 10) {
    const newPrizes = [];
    const batchOperations = [];

    for (let i = 0; i < count; i++) {
      try {
        // Generate random position
        const position = {
          x: Math.floor(Math.random() * 1000),
          y: Math.floor(Math.random() * 1000),
        };

        // Generate random value
        const value =
          Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue;

        // Generate random type
        const types = Object.values(this.PRIZE_TYPES);
        const type = types[Math.floor(Math.random() * types.length)];

        // Set expiration (30 minutes)
        const expirationTime = 30 * 60 * 1000;

        // Add to batch operations
        batchOperations.push(
          this.spawnPrize(type, value, position, expirationTime)
        );
      } catch (error) {
        console.error("Error preparing random prize:", error);
      }
    }

    // Execute all spawn operations in parallel
    if (batchOperations.length > 0) {
      try {
        const results = await Promise.allSettled(batchOperations);

        for (const result of results) {
          if (result.status === "fulfilled") {
            newPrizes.push(result.value);
          }
        }
      } catch (error) {
        console.error("Error spawning batch prizes:", error);
      }
    }

    return newPrizes;
  }
}

module.exports = new PrizeService();
