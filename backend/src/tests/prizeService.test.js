const prizeService = require("../services/prizeService");
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

describe("PrizeService", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Reset the prize service state
    prizeService.activePrizes.clear();
  });

  describe("validatePosition", () => {
    test("should return true for valid positions", () => {
      expect(prizeService.validatePosition({ x: 0, y: 0 })).toBe(true);
      expect(prizeService.validatePosition({ x: 500, y: 500 })).toBe(true);
      expect(prizeService.validatePosition({ x: 1000, y: 1000 })).toBe(true);
    });

    test("should return false for invalid positions", () => {
      expect(prizeService.validatePosition(null)).toBe(false);
      expect(prizeService.validatePosition({})).toBe(false);
      expect(prizeService.validatePosition({ x: -1, y: 100 })).toBe(false);
      expect(prizeService.validatePosition({ x: 100, y: -1 })).toBe(false);
      expect(prizeService.validatePosition({ x: 1001, y: 100 })).toBe(false);
      expect(prizeService.validatePosition({ x: 100, y: 1001 })).toBe(false);
      expect(prizeService.validatePosition({ x: "abc", y: 100 })).toBe(false);
      expect(prizeService.validatePosition({ x: 100, y: "abc" })).toBe(false);
    });
  });

  describe("spawnPrize", () => {
    test("should spawn a prize and add it to activePrizes", async () => {
      // Mock database response
      const mockPrize = {
        id: 1,
        position_x: 100,
        position_y: 200,
        prize_type: "coin",
        value: 10,
        created_at: new Date(),
        expires_at: null,
      };

      pgPool.query.mockResolvedValueOnce({ rows: [mockPrize] });

      // Call spawn prize
      const position = { x: 100, y: 200 };
      const result = await prizeService.spawnPrize("coin", 10, position);

      // Verify the database was called correctly
      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO prizes"),
        expect.arrayContaining([100, 200, "coin", 10, "active"])
      );

      // Verify prize was added to activePrizes
      expect(prizeService.activePrizes.size).toBe(1);
      expect(prizeService.activePrizes.get(1)).toBeDefined();

      // Verify the result matches expected structure
      expect(result).toEqual({
        id: 1,
        position: { x: 100, y: 200 },
        type: "coin",
        value: 10,
        createdAt: mockPrize.created_at,
        expiresAt: null,
      });
    });

    test("should reject invalid prize types", async () => {
      await expect(
        prizeService.spawnPrize("invalid_type", 10, { x: 100, y: 200 })
      ).rejects.toThrow("Invalid prize type");

      // Verify no database call was made
      expect(pgPool.query).not.toHaveBeenCalled();
    });

    test("should reject invalid positions", async () => {
      await expect(
        prizeService.spawnPrize("coin", 10, { x: -100, y: 200 })
      ).rejects.toThrow("Invalid prize position");

      // Verify no database call was made
      expect(pgPool.query).not.toHaveBeenCalled();
    });
  });

  describe("findNearbyPrizes", () => {
    beforeEach(() => {
      // Setup some test prizes
      prizeService.activePrizes.set(1, {
        id: 1,
        position: { x: 100, y: 100 },
        type: "coin",
        value: 10,
      });

      prizeService.activePrizes.set(2, {
        id: 2,
        position: { x: 200, y: 200 },
        type: "token",
        value: 20,
      });

      prizeService.activePrizes.set(3, {
        id: 3,
        position: { x: 500, y: 500 },
        type: "powerup",
        value: 30,
      });
    });

    test("should find prizes within claim distance", () => {
      const position = { x: 120, y: 120 };
      const result = prizeService.findNearbyPrizes(position);

      // Should find the prize at (100, 100) but not others
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].distance).toBeDefined();
    });

    test("should sort prizes by distance", () => {
      // Position equidistant to two prizes
      const position = { x: 150, y: 150 };
      const result = prizeService.findNearbyPrizes(position);

      // Should find two prizes
      expect(result.length).toBe(2);

      // First one should be closest
      expect(result[0].distance).toBeLessThan(result[1].distance);
    });

    test("should return empty array when no prizes nearby", () => {
      const position = { x: 800, y: 800 };
      const result = prizeService.findNearbyPrizes(position);

      expect(result.length).toBe(0);
    });
  });

  describe("claimPrize", () => {
    beforeEach(() => {
      // Add a prize to the active prizes
      prizeService.activePrizes.set(1, {
        id: 1,
        position: { x: 100, y: 100 },
        type: "coin",
        value: 10,
      });
    });

    test("should successfully claim a prize", async () => {
      // Mock database responses
      pgPool.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, status: "active" }] }) // SELECT
        .mockResolvedValueOnce() // UPDATE prizes
        .mockResolvedValueOnce() // INSERT user_prizes
        .mockResolvedValueOnce(); // COMMIT

      const result = await prizeService.claimPrize(1, 123);

      // Verify the result
      expect(result).toBe(true);

      // Verify the database calls
      expect(pgPool.query).toHaveBeenCalledWith("BEGIN");
      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE prizes"),
        expect.arrayContaining(["claimed", 123, 1])
      );
      expect(pgPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO user_prizes"),
        expect.arrayContaining([123, 1, "claimed"])
      );
      expect(pgPool.query).toHaveBeenCalledWith("COMMIT");

      // Verify prize was removed from active prizes
      expect(prizeService.activePrizes.has(1)).toBe(false);
    });

    test("should fail to claim an already claimed prize", async () => {
      // Mock database responses
      pgPool.query
        .mockResolvedValueOnce() // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Empty SELECT (no active prize)
        .mockResolvedValueOnce(); // ROLLBACK

      const result = await prizeService.claimPrize(1, 123);

      // Verify the result
      expect(result).toBe(false);

      // Verify the database calls
      expect(pgPool.query).toHaveBeenCalledWith("BEGIN");
      expect(pgPool.query).toHaveBeenCalledWith("ROLLBACK");
    });

    test("should handle database errors", async () => {
      // Mock database error
      pgPool.query
        .mockResolvedValueOnce() // BEGIN
        .mockRejectedValueOnce(new Error("Database error")) // SELECT throws error
        .mockResolvedValueOnce(); // ROLLBACK

      await expect(prizeService.claimPrize(1, 123)).rejects.toThrow(
        "Database error"
      );

      // Verify ROLLBACK was called
      expect(pgPool.query).toHaveBeenCalledWith("ROLLBACK");
    });
  });
});
