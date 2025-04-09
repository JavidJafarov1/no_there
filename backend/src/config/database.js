const { Pool } = require("pg");
const Redis = require("redis");

// PostgreSQL connection pool with optimized settings for high concurrency
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || "postgres",
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "postgres",
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection to become available
});

// Redis client with optimized settings
const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = Redis.createClient({
  url: `redis://${redisHost}:${redisPort}`,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000), // Exponential backoff with max of 2s
  },
});

// Redis publisher client for pub/sub pattern (used for horizontal scaling)
const redisPublisher = Redis.createClient({
  url: `redis://${redisHost}:${redisPort}`,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
  },
});

// Redis subscriber client for pub/sub pattern
const redisSubscriber = Redis.createClient({
  url: `redis://${redisHost}:${redisPort}`,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 2000),
  },
});

const setupDatabase = async () => {
  try {
    // Test PostgreSQL connection
    await pgPool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully");

    // Test Redis connections
    await redisClient.connect();
    await redisPublisher.connect();
    await redisSubscriber.connect();
    console.log("Redis clients connected successfully");

    // Setup error handlers for reconnection
    pgPool.on("error", (err) => {
      console.error("Unexpected PostgreSQL error:", err);
      // Don't crash on connection errors, attempt to reconnect
    });

    redisClient.on("error", (err) => {
      console.error("Redis client error:", err);
    });

    redisPublisher.on("error", (err) => {
      console.error("Redis publisher error:", err);
    });

    redisSubscriber.on("error", (err) => {
      console.error("Redis subscriber error:", err);
    });

    // Initialize database tables
    try {
      await initializeTables();
    } catch (tableError) {
      console.error(
        "Warning: Error initializing tables, but continuing:",
        tableError.message
      );
      // Don't throw here, allow the app to start even if tables can't be created
      // This is useful for development environments
    }
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
};

const initializeTables = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) UNIQUE NOT NULL,
      username VARCHAR(50) UNIQUE,
      avatar_url TEXT,
      last_login TIMESTAMP WITH TIME ZONE,
      last_position_x FLOAT,
      last_position_y FLOAT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      socket_id VARCHAR(50),
      ip_address VARCHAR(50),
      user_agent TEXT,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expired_at TIMESTAMP WITH TIME ZONE
    );
  `;

  const createPrizesTable = `
    CREATE TABLE IF NOT EXISTS prizes (
      id SERIAL PRIMARY KEY,
      position_x FLOAT NOT NULL,
      position_y FLOAT NOT NULL,
      prize_type VARCHAR(50) NOT NULL,
      value INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'active',
      claimed_by INTEGER REFERENCES users(id),
      claimed_at TIMESTAMP WITH TIME ZONE,
      transaction_hash VARCHAR(66),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP WITH TIME ZONE
    );
  `;

  const createUserPrizesTable = `
    CREATE TABLE IF NOT EXISTS user_prizes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      prize_id INTEGER REFERENCES prizes(id) NOT NULL,
      claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      transaction_hash VARCHAR(66),
      status VARCHAR(20) DEFAULT 'pending',
      UNIQUE(user_id, prize_id)
    );
  `;

  const createSocialAccountsTable = `
    CREATE TABLE IF NOT EXISTS social_accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) NOT NULL,
      platform VARCHAR(50) NOT NULL,
      platform_user_id VARCHAR(100) NOT NULL,
      username VARCHAR(100),
      profile_url TEXT,
      verified BOOLEAN DEFAULT false,
      verification_token VARCHAR(100),
      verification_date TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, platform),
      UNIQUE(platform, platform_user_id)
    );
  `;

  // Add indexes for frequently queried columns
  const createIndexes = `
    CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_prizes_status ON prizes(status);
    CREATE INDEX IF NOT EXISTS idx_prizes_position ON prizes(position_x, position_y);
    CREATE INDEX IF NOT EXISTS idx_user_prizes_user_id ON user_prizes(user_id);
    CREATE INDEX IF NOT EXISTS idx_social_accounts_user_id ON social_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_accounts(platform);
    CREATE INDEX IF NOT EXISTS idx_social_accounts_verified ON social_accounts(verified);
  `;

  try {
    await pgPool.query(createUsersTable);
    await pgPool.query(createSessionsTable);
    await pgPool.query(createPrizesTable);
    await pgPool.query(createUserPrizesTable);
    await pgPool.query(createSocialAccountsTable);
    await pgPool.query(createIndexes);
    console.log("Database tables and indexes initialized successfully");
  } catch (error) {
    console.error("Error initializing tables:", error);
    throw error;
  }
};

module.exports = {
  setupDatabase,
  pgPool,
  redisClient,
  redisPublisher,
  redisSubscriber,
};
