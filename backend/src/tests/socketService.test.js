const SocketService = require("../services/SocketService");
const { pgPool } = require("../config/database");

// Mock the database connection
jest.mock("../config/database", () => ({
  pgPool: {
    query: jest.fn(),
  },
  redisClient: {
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

describe("SocketService", () => {
  let socketService;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Create a new instance of SocketService
    socketService = new SocketService();
  });

  describe("validatePosition", () => {
    test("should return true for valid positions", () => {
      expect(socketService.validatePosition({ x: 0, y: 0 })).toBe(true);
      expect(socketService.validatePosition({ x: 500, y: 500 })).toBe(true);
      expect(socketService.validatePosition({ x: 1000, y: 1000 })).toBe(true);
    });

    test("should return false for invalid positions", () => {
      expect(socketService.validatePosition(null)).toBe(false);
      expect(socketService.validatePosition({})).toBe(false);
      expect(socketService.validatePosition({ x: -1, y: 100 })).toBe(false);
      expect(socketService.validatePosition({ x: 100, y: -1 })).toBe(false);
      expect(socketService.validatePosition({ x: 1001, y: 100 })).toBe(false);
      expect(socketService.validatePosition({ x: 100, y: 1001 })).toBe(false);
      expect(socketService.validatePosition({ x: "abc", y: 100 })).toBe(false);
      expect(socketService.validatePosition({ x: 100, y: "abc" })).toBe(false);
    });
  });

  describe("validateMovement", () => {
    test("should return true for valid movements", () => {
      const currentPosition = { x: 100, y: 100 };
      const newPosition = { x: 101, y: 101 };
      const lastUpdateTime = Date.now() - 1000; // 1 second ago

      expect(
        socketService.validateMovement(
          currentPosition,
          newPosition,
          lastUpdateTime
        )
      ).toBe(true);
    });

    test("should return false for movements that are too fast", () => {
      const currentPosition = { x: 100, y: 100 };
      const newPosition = { x: 200, y: 200 }; // Too far for a short time period
      const lastUpdateTime = Date.now() - 100; // 100ms ago

      expect(
        socketService.validateMovement(
          currentPosition,
          newPosition,
          lastUpdateTime
        )
      ).toBe(false);
    });

    test("should return false for movements that are too frequent", () => {
      const currentPosition = { x: 100, y: 100 };
      const newPosition = { x: 101, y: 101 };
      const lastUpdateTime = Date.now() - 10; // 10ms ago (too frequent)

      expect(
        socketService.validateMovement(
          currentPosition,
          newPosition,
          lastUpdateTime
        )
      ).toBe(false);
    });
  });

  describe("addUser", () => {
    test("should add a new user and create a session", async () => {
      // Mock database responses
      pgPool.query
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({
          rows: [{ id: 123, wallet_address: "test-wallet" }],
        }) // New user created
        .mockResolvedValueOnce({ rows: [{ id: 456 }] }); // Session created

      const result = await socketService.addUser("socket1", "test-wallet");

      // Verify the result
      expect(result).toEqual({
        socketId: "socket1",
        address: "test-wallet",
        position: { x: 0, y: 0 },
      });

      // Verify user was added to connectedUsers
      expect(socketService.connectedUsers.size).toBe(1);
      expect(socketService.connectedUsers.get("socket1")).toBeDefined();
      expect(socketService.connectedUsers.get("socket1").userId).toBe(123);

      // Verify database calls
      expect(pgPool.query).toHaveBeenCalledTimes(3);
    });

    test("should handle existing users", async () => {
      // Mock database responses
      const existingUser = { id: 123, wallet_address: "test-wallet" };
      pgPool.query
        .mockResolvedValueOnce({ rows: [existingUser] }) // Existing user found
        .mockResolvedValueOnce() // User updated
        .mockResolvedValueOnce({ rows: [{ id: 456 }] }); // Session created

      const result = await socketService.addUser("socket1", "test-wallet");

      // Verify user was added to connectedUsers
      expect(socketService.connectedUsers.size).toBe(1);
      expect(socketService.connectedUsers.get("socket1")).toBeDefined();
      expect(socketService.connectedUsers.get("socket1").userId).toBe(123);

      // Verify database calls - should update existing user
      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET last_login"),
        expect.arrayContaining([existingUser.id])
      );
    });

    test("should handle duplicate sessions", async () => {
      // Mock database responses for existing session
      pgPool.query
        .mockResolvedValueOnce({ rows: [{ id: 789 }] }) // Existing session found
        .mockResolvedValueOnce() // Session expired
        .mockResolvedValueOnce({ rows: [{ id: 123 }] }) // User found
        .mockResolvedValueOnce() // User updated
        .mockResolvedValueOnce({ rows: [{ id: 456 }] }); // New session created

      // Act as if this method is called by findActiveSessionByWalletAddress
      jest
        .spyOn(socketService, "findActiveSessionByWalletAddress")
        .mockResolvedValueOnce({ id: 789 });

      const result = await socketService.addUser("socket1", "test-wallet");

      // Verify user was added to connectedUsers
      expect(socketService.connectedUsers.size).toBe(1);

      // Verify expireSession was called
      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE sessions SET status = 'expired'"),
        expect.arrayContaining([789])
      );
    });
  });

  describe("updateUserMovement", () => {
    beforeEach(() => {
      // Setup a test user
      socketService.connectedUsers.set("socket1", {
        id: "socket1",
        userId: 123,
        address: "test-wallet",
        position: { x: 100, y: 100 },
        lastUpdate: Date.now() - 1000,
      });
    });

    test("should update user movement for valid positions", () => {
      // Set last update time to allow movement
      socketService.lastUpdateTimes.set("socket1", Date.now() - 200);

      const result = socketService.updateUserMovement("socket1", {
        x: 105,
        y: 105,
      });

      // Verify result
      expect(result).toBe(true);

      // Verify user position was updated
      expect(socketService.connectedUsers.get("socket1").position).toEqual({
        x: 105,
        y: 105,
      });

      // Verify lastUpdateTimes was updated
      expect(socketService.lastUpdateTimes.get("socket1")).toBeDefined();
    });

    test("should reject invalid positions", () => {
      const result = socketService.updateUserMovement("socket1", {
        x: -10,
        y: 100,
      });

      // Verify result
      expect(result).toBe(false);

      // Verify user position was not updated
      expect(socketService.connectedUsers.get("socket1").position).toEqual({
        x: 100,
        y: 100,
      });
    });

    test("should rate limit frequent updates", () => {
      // Set very recent last update time
      socketService.lastUpdateTimes.set("socket1", Date.now() - 50);

      const result = socketService.updateUserMovement("socket1", {
        x: 105,
        y: 105,
      });

      // Verify result
      expect(result).toBe(false);

      // Verify user position was not updated
      expect(socketService.connectedUsers.get("socket1").position).toEqual({
        x: 100,
        y: 100,
      });
    });

    test("should reject movements that are too fast", () => {
      // Set last update time to allow movement
      socketService.lastUpdateTimes.set("socket1", Date.now() - 200);

      // Try to move too far
      const result = socketService.updateUserMovement("socket1", {
        x: 200,
        y: 200,
      });

      // Verify result
      expect(result).toBe(false);

      // Verify user position was not updated
      expect(socketService.connectedUsers.get("socket1").position).toEqual({
        x: 100,
        y: 100,
      });
    });

    test("should handle unknown users", () => {
      const result = socketService.updateUserMovement("unknown", {
        x: 105,
        y: 105,
      });

      // Verify result
      expect(result).toBe(false);
    });
  });

  describe("removeUser", () => {
    beforeEach(() => {
      // Setup a test user
      socketService.connectedUsers.set("socket1", {
        id: "socket1",
        userId: 123,
        address: "test-wallet",
        position: { x: 100, y: 100 },
        lastUpdate: Date.now(),
        sessionId: 456,
      });

      socketService.lastUpdateTimes.set("socket1", Date.now());
      socketService.activeSessions.set(456, {
        userId: 123,
        socketId: "socket1",
      });

      // Mock expireSession
      jest.spyOn(socketService, "expireSession").mockResolvedValue();
      jest.spyOn(socketService, "updateUserPosition").mockResolvedValue();
    });

    test("should remove a user and expire their session", () => {
      socketService.removeUser("socket1");

      // Verify expireSession was called
      expect(socketService.expireSession).toHaveBeenCalledWith(456);

      // Verify updateUserPosition was called
      expect(socketService.updateUserPosition).toHaveBeenCalledWith(123, {
        x: 100,
        y: 100,
      });

      // Verify user was removed from connectedUsers and lastUpdateTimes
      expect(socketService.connectedUsers.has("socket1")).toBe(false);
      expect(socketService.lastUpdateTimes.has("socket1")).toBe(false);
    });

    test("should handle unknown users", () => {
      socketService.removeUser("unknown");

      // Verify expireSession and updateUserPosition were not called
      expect(socketService.expireSession).not.toHaveBeenCalled();
      expect(socketService.updateUserPosition).not.toHaveBeenCalled();
    });
  });
});
