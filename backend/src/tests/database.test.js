const { Pool } = require('pg');
require('dotenv').config();

describe('Database Connection and CRUD Operations', () => {
  let pool;

  beforeAll(async () => {
    pool = new Pool({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      database: process.env.POSTGRES_DB,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  // Test database connection
  test('should connect to database', async () => {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    expect(result.rows[0]).toBeDefined();
    client.release();
  });

  // Test CRUD operations for users
  describe('User CRUD Operations', () => {
    const testUser = {
      wallet_address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
      username: 'testuser'
    };

    beforeAll(async () => {
      // Create users table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          wallet_address VARCHAR(42) UNIQUE NOT NULL,
          username VARCHAR(50) UNIQUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    });

    afterAll(async () => {
      // Clean up test data
      await pool.query('DELETE FROM users WHERE wallet_address = $1', [testUser.wallet_address]);
    });

    // Test CREATE operation
    test('should create a new user', async () => {
      const result = await pool.query(
        'INSERT INTO users (wallet_address, username) VALUES ($1, $2) RETURNING *',
        [testUser.wallet_address, testUser.username]
      );
      expect(result.rows[0].wallet_address).toBe(testUser.wallet_address);
      expect(result.rows[0].username).toBe(testUser.username);
    });

    // Test READ operation
    test('should read user by wallet address', async () => {
      const result = await pool.query(
        'SELECT * FROM users WHERE wallet_address = $1',
        [testUser.wallet_address]
      );
      expect(result.rows[0].wallet_address).toBe(testUser.wallet_address);
      expect(result.rows[0].username).toBe(testUser.username);
    });

    // Test UPDATE operation
    test('should update user username', async () => {
      const updatedUsername = 'updateduser';
      const result = await pool.query(
        'UPDATE users SET username = $1 WHERE wallet_address = $2 RETURNING *',
        [updatedUsername, testUser.wallet_address]
      );
      expect(result.rows[0].username).toBe(updatedUsername);
    });

    // Test DELETE operation
    test('should delete user', async () => {
      await pool.query(
        'DELETE FROM users WHERE wallet_address = $1',
        [testUser.wallet_address]
      );
      const result = await pool.query(
        'SELECT * FROM users WHERE wallet_address = $1',
        [testUser.wallet_address]
      );
      expect(result.rows.length).toBe(0);
    });
  });

  // Test CRUD operations for sessions
  describe('Session CRUD Operations', () => {
    let userId;
    const testSession = {
      status: 'active'
    };

    beforeAll(async () => {
      // Create sessions table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create a test user first
      const userResult = await pool.query(
        'INSERT INTO users (wallet_address, username) VALUES ($1, $2) RETURNING id',
        ['0x742d35Cc6634C0532925a3b844Bc454e4438f44f', 'sessiontestuser']
      );
      userId = userResult.rows[0].id;
    });

    afterAll(async () => {
      // Clean up test data
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    });

    // Test CREATE operation
    test('should create a new session', async () => {
      const result = await pool.query(
        'INSERT INTO sessions (user_id, status) VALUES ($1, $2) RETURNING *',
        [userId, testSession.status]
      );
      expect(result.rows[0].user_id).toBe(userId);
      expect(result.rows[0].status).toBe(testSession.status);
    });

    // Test READ operation
    test('should read session by user_id', async () => {
      const result = await pool.query(
        'SELECT * FROM sessions WHERE user_id = $1',
        [userId]
      );
      expect(result.rows[0].user_id).toBe(userId);
      expect(result.rows[0].status).toBe(testSession.status);
    });

    // Test UPDATE operation
    test('should update session status', async () => {
      const updatedStatus = 'inactive';
      const result = await pool.query(
        'UPDATE sessions SET status = $1 WHERE user_id = $2 RETURNING *',
        [updatedStatus, userId]
      );
      expect(result.rows[0].status).toBe(updatedStatus);
    });

    // Test DELETE operation
    test('should delete session', async () => {
      await pool.query(
        'DELETE FROM sessions WHERE user_id = $1',
        [userId]
      );
      const result = await pool.query(
        'SELECT * FROM sessions WHERE user_id = $1',
        [userId]
      );
      expect(result.rows.length).toBe(0);
    });
  });
}); 