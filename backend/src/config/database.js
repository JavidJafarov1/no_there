const { Pool } = require('pg');
const Redis = require('redis');

// PostgreSQL connection pool
const pgPool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// Redis client
const redisClient = Redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
});

const setupDatabase = async () => {
  try {
    // Test PostgreSQL connection
    await pgPool.query('SELECT NOW()');
    console.log('PostgreSQL connected successfully');

    // Test Redis connection
    await redisClient.connect();
    console.log('Redis connected successfully');

    // Initialize database tables
    await initializeTables();
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

const initializeTables = async () => {
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      wallet_address VARCHAR(42) UNIQUE NOT NULL,
      username VARCHAR(50) UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await pgPool.query(createUsersTable);
    await pgPool.query(createSessionsTable);
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
};

module.exports = {
  setupDatabase,
  pgPool,
  redisClient
}; 