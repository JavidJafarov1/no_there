const { verifyWalletSignature } = require('../services/blockchain');
const { verifyFirebaseToken } = require('../middleware/auth');

const setupSocketHandlers = (io) => {
  console.log('Setting up socket handlers...');

  const connectedUsers = new Map();
  const lastUpdateTimes = new Map();
  const UPDATE_RATE_LIMIT = 100; // Minimum time between updates in ms

  const validatePosition = (position) => {
    return (
      position &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      !isNaN(position.x) &&
      !isNaN(position.y) &&
      position.x >= 0 &&
      position.y >= 0 &&
      position.x <= 1000 &&
      position.y <= 1000
    );
  };

  const cleanupStaleConnections = () => {
    const now = Date.now();
    const STALE_TIMEOUT = 30000; // 30 seconds

    for (const [id, userData] of connectedUsers.entries()) {
      if (now - userData.lastUpdate > STALE_TIMEOUT) {
        connectedUsers.delete(id);
        io.emit('userLeft', {
          id,
          address: userData.address
        });
      }
    }
  };

  // Clean up stale connections every minute
  setInterval(cleanupStaleConnections, 60000);

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Automatically add user on connection
    const address = `player-${socket.id}`;
    socket.userAddress = address;
    
    // Add to connected users
    connectedUsers.set(socket.id, {
      id: socket.id,
      address: address,
      position: { x: 0, y: 0 },
      lastUpdate: Date.now()
    });

    console.log('User connected:', {
      socketId: socket.id,
      address: address,
      connectedUsersCount: connectedUsers.size
    });

    // Notify other users about new player
    socket.broadcast.emit('newPlayer', {
      id: socket.id,
      address: address,
      position: { x: 0, y: 0 }
    });

    // Send current players to new user
    const players = Array.from(connectedUsers.values());
    socket.emit('players_update', players);

    // Set up ping/pong
    socket.on('ping', () => {
      console.log('Received ping from client:', socket.id);
      socket.emit('pong');
    });

    // Handle user movement
    socket.on('userMovement', (data) => {
      console.log('Received movement from:', socket.id, 'Data:', data);

      // Rate limiting with more lenient handling
      const lastUpdate = lastUpdateTimes.get(socket.id) || 0;
      const now = Date.now();
      if (now - lastUpdate < UPDATE_RATE_LIMIT) {
        console.log('Rate limited movement from:', socket.id);
        return; // Skip update but don't disconnect
      }
      lastUpdateTimes.set(socket.id, now);

      // Validate position data
      if (!validatePosition(data.position)) {
        console.error('Invalid position data from:', socket.id, 'Data:', data.position);
        socket.emit('error', { message: 'Invalid position data' });
        return;
      }

      // Update user position
      const userData = connectedUsers.get(socket.id);
      if (userData) {
        userData.position = data.position;
        userData.lastUpdate = now;
        console.log('Updated position for:', socket.id, 'New position:', data.position);
      }

      // Broadcast movement to all other clients
      socket.broadcast.emit('userMoved', {
        id: socket.id,
        address: socket.userAddress,
        position: data.position,
        timestamp: data.timestamp
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('Client disconnected:', socket.id, 'Reason:', reason);
      connectedUsers.delete(socket.id);
      lastUpdateTimes.delete(socket.id);
      console.log('Removed user data for:', socket.id);
      io.emit('userLeft', {
        id: socket.id,
        address: socket.userAddress
      });
    });
  });

  console.log('Socket handlers setup complete');
};

module.exports = {
  setupSocketHandlers
}; 