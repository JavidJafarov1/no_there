const { verifyWalletSignature } = require("../services/blockchain");
const { verifyFirebaseToken } = require("../middleware/auth");
const SocketService = require("../services/SocketService");
const prizeService = require("../services/prizeService");
const { redisPublisher, redisSubscriber } = require("../config/database");

// Generate a unique server ID for this instance
const SERVER_ID = Math.random().toString(36).substring(2, 15);
const REDIS_CHANNEL = "game_events";

const setupSocketHandlers = (io) => {
  console.log(`Setting up socket handlers for server instance ${SERVER_ID}...`);

  // Initialize services
  const socketService = new SocketService();

  // Initialize prize service
  prizeService.initialize().catch((err) => {
    console.error("Failed to initialize prize service:", err);
  });

  // Setup Redis pub/sub for cross-instance communication
  setupRedisPubSub(io, socketService);

  // Spawn initial prizes
  prizeService.spawnRandomPrizes(10).catch((err) => {
    console.error("Failed to spawn initial prizes:", err);
  });

  // Set up periodic prize spawning (every 5 minutes)
  setInterval(() => {
    prizeService.spawnRandomPrizes(5).catch((err) => {
      console.error("Failed to spawn periodic prizes:", err);
    });
  }, 5 * 60 * 1000);

  // Clean up stale connections every minute
  setInterval(() => {
    socketService
      .cleanupStaleConnections()
      .then((staleConnections) => {
        if (staleConnections.length > 0) {
          console.log(
            `Cleaned up ${staleConnections.length} stale connections`
          );

          // Notify other clients about disconnected users
          for (const socketId of staleConnections) {
            io.emit("userLeft", { id: socketId });

            // Publish to other server instances
            publishEvent({
              type: "user_left",
              data: { id: socketId },
              source: SERVER_ID,
            });
          }
        }
      })
      .catch((err) => {
        console.error("Error cleaning up stale connections:", err);
      });
  }, 60000);

  // Check connected clients count periodically for monitoring
  setInterval(() => {
    const count = io.engine.clientsCount;
    console.log(`Current connected clients: ${count}`);
  }, 30000);

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    // Handle authentication
    socket.on("authenticate", async (data) => {
      try {
        // For now, we'll just use the address directly without verification
        // In production, we would verify the wallet signature
        const address = data.address || `player-${socket.id}`;

        // Add user to connected users
        const userData = await socketService.addUser(socket.id, address);

        socket.userAddress = address;

        console.log("User authenticated:", {
          socketId: socket.id,
          address: address,
        });

        // Notify client of successful authentication
        socket.emit("authenticated", {
          success: true,
          id: socket.id,
          address: address,
        });

        // Notify other users about new player
        socket.broadcast.emit("newPlayer", {
          id: socket.id,
          address: address,
          position: userData.position,
        });

        // Publish new player to other server instances
        publishEvent({
          type: "new_player",
          data: {
            id: socket.id,
            address: address,
            position: userData.position,
          },
          source: SERVER_ID,
        });

        // Send current players to new user
        const players = socketService.getConnectedUsers();
        socket.emit("players_update", players);

        // Send active prizes to the user
        const prizes = prizeService.getAllActivePrizes();
        socket.emit("prizes_update", prizes);
      } catch (error) {
        console.error("Authentication error:", error);
        socket.emit("authenticated", {
          success: false,
          error: error.message,
        });
      }
    });

    // Set up ping/pong
    socket.on("ping", () => {
      console.log("Received ping from client:", socket.id);
      socket.emit("pong");
    });

    // Handle user movement
    socket.on("userMovement", (data) => {
      if (!socket.userAddress) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      console.log("Received movement from:", socket.id, "Data:", data);

      // Validate and update movement
      const isValid = socketService.updateUserMovement(
        socket.id,
        data.position
      );

      if (!isValid) {
        console.warn("Invalid movement detected from:", socket.id);

        // Get the current user data to send back the correct position
        const userData = socketService.getUser(socket.id);
        if (userData) {
          // Send the correct position back to the client
          socket.emit("position_correction", {
            position: userData.position,
          });
        }
        return;
      }

      // Broadcast movement to all other clients in this instance
      socket.broadcast.emit("userMoved", {
        id: socket.id,
        address: socket.userAddress,
        position: data.position,
        timestamp: data.timestamp,
      });

      // Publish movement to other server instances
      publishEvent({
        type: "user_moved",
        data: {
          id: socket.id,
          address: socket.userAddress,
          position: data.position,
          timestamp: data.timestamp,
        },
        source: SERVER_ID,
      });

      // Check for prize claims
      const userData = socketService.getUser(socket.id);
      if (userData) {
        prizeService
          .attemptPrizeClaim(userData.userId, data.position)
          .then((prize) => {
            if (prize) {
              // Notify the user that they claimed a prize
              socket.emit("got_prize", {
                id: prize.id,
                type: prize.type,
                value: prize.value,
                position: prize.position,
              });

              // Notify all clients that a prize was claimed
              io.emit("prize_claimed", {
                id: prize.id,
                userId: userData.userId,
                userAddress: userData.address,
              });

              // Publish prize claim to other server instances
              publishEvent({
                type: "prize_claimed",
                data: {
                  id: prize.id,
                  userId: userData.userId,
                  userAddress: userData.address,
                },
                source: SERVER_ID,
              });
            }
          })
          .catch((err) => {
            console.error("Error checking for prize claims:", err);
          });
      }
    });

    // Handle prize spawn requests (admin only)
    socket.on("spawn_prize", (data) => {
      // TODO: Add admin authentication
      if (!socket.userAddress) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      const { type, value, position } = data;

      prizeService
        .spawnPrize(type, value, position)
        .then((prize) => {
          // Notify all clients about the new prize
          io.emit("prize_spawned", {
            id: prize.id,
            type: prize.type,
            value: prize.value,
            position: prize.position,
          });

          // Publish new prize to other server instances
          publishEvent({
            type: "new_prize",
            data: {
              id: prize.id,
              type: prize.type,
              value: prize.value,
              position: prize.position,
            },
            source: SERVER_ID,
          });
        })
        .catch((err) => {
          console.error("Error spawning prize:", err);
          socket.emit("error", { message: "Failed to spawn prize" });
        });
    });

    // Handle request for all prizes
    socket.on("requestPrizes", () => {
      console.log(`Client ${socket.id} requested all prizes`);
      if (!socket.userAddress) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      // Get all active prizes
      const prizes = prizeService.getAllActivePrizes();

      // Convert array to object with prize.id as keys for easier client-side handling
      const prizesObj = {};
      prizes.forEach((prize) => {
        prizesObj[prize.id] = prize;
      });

      // Send prizes to requesting client
      socket.emit("prizes_update", prizesObj);
    });

    // Handle prize claim check
    socket.on("checkPrize", (data) => {
      if (!socket.userAddress) {
        socket.emit("error", { message: "Not authenticated" });
        return;
      }

      const { position } = data;

      // Check if position is valid
      if (
        !position ||
        typeof position.x !== "number" ||
        typeof position.y !== "number"
      ) {
        socket.emit("error", { message: "Invalid position data" });
        return;
      }

      // Get user data
      const userData = socketService.getUser(socket.id);
      if (!userData) {
        socket.emit("error", { message: "User data not found" });
        return;
      }

      // Attempt to claim prize
      prizeService
        .attemptPrizeClaim(userData.userId, position)
        .then((prize) => {
          if (prize) {
            // Notify the user that they claimed a prize
            socket.emit("got_prize", {
              id: prize.id,
              type: prize.type,
              value: prize.value,
              position: prize.position,
            });

            // Notify all clients that a prize was claimed
            io.emit("prize_claimed", {
              prizeId: prize.id,
              claimedBy: socket.id,
              prize: prize,
              userAddress: userData.address,
            });

            // Publish prize claim to other server instances
            publishEvent({
              type: "prize_claimed",
              data: {
                prizeId: prize.id,
                claimedBy: socket.id,
                prize: prize,
                userAddress: userData.address,
              },
              source: SERVER_ID,
            });
          }
        })
        .catch((err) => {
          console.error("Error checking for prize claims:", err);
        });
    });

    // Handle disconnection
    socket.on("disconnect", (reason) => {
      console.log("Client disconnected:", socket.id, "Reason:", reason);

      socketService.removeUser(socket.id);

      io.emit("userLeft", {
        id: socket.id,
        address: socket.userAddress,
      });

      // Publish to other server instances
      publishEvent({
        type: "user_left",
        data: {
          id: socket.id,
          address: socket.userAddress,
        },
        source: SERVER_ID,
      });
    });
  });

  console.log("Socket handlers setup complete");
};

/**
 * Set up Redis pub/sub for cross-instance communication
 */
function setupRedisPubSub(io, socketService) {
  // Subscribe to the game events channel
  redisSubscriber.subscribe(REDIS_CHANNEL, (message) => {
    try {
      const event = JSON.parse(message);

      // Ignore events from this server instance
      if (event.source === SERVER_ID) {
        return;
      }

      console.log(`Received event from another server: ${event.type}`);

      // Process events from other server instances
      switch (event.type) {
        case "user_moved":
          io.emit("userMoved", event.data);
          break;
        case "new_player":
          io.emit("newPlayer", event.data);
          break;
        case "user_left":
          io.emit("userLeft", event.data);
          break;
        case "prize_claimed":
          // Handle the new prize_claimed event format
          io.emit("prize_claimed", {
            prizeId: event.data.prizeId,
            claimedBy: event.data.claimedBy,
            prize: event.data.prize,
            userAddress: event.data.userAddress,
          });
          break;
        case "new_prize":
          // Renamed to match client's expected event
          io.emit("prize_spawned", {
            id: event.data.id,
            type: event.data.type,
            value: event.data.value,
            position: event.data.position,
          });
          break;
      }
    } catch (error) {
      console.error("Error processing Redis message:", error);
    }
  });

  console.log(`Subscribed to Redis channel: ${REDIS_CHANNEL}`);
}

/**
 * Publish an event to other server instances via Redis
 */
function publishEvent(event) {
  try {
    redisPublisher.publish(REDIS_CHANNEL, JSON.stringify(event));
  } catch (error) {
    console.error("Error publishing event to Redis:", error);
  }
}

module.exports = {
  setupSocketHandlers,
};
