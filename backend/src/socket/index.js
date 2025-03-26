const { verifyWalletSignature } = require('../services/blockchain');

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('New client connected');

    // Handle user authentication
    socket.on('authenticate', async (data) => {
      try {
        const { signature, message, address } = data;
        const isValid = await verifyWalletSignature(signature, message, address);
        
        if (isValid) {
          socket.userAddress = address;
          socket.emit('authenticated', { success: true });
        } else {
          socket.emit('authenticated', { success: false, error: 'Invalid signature' });
        }
      } catch (error) {
        socket.emit('authenticated', { success: false, error: error.message });
      }
    });

    // Handle user movement
    socket.on('userMovement', (data) => {
      if (!socket.userAddress) {
        socket.emit('error', { message: 'User not authenticated' });
        return;
      }

      // Broadcast movement to all other clients
      socket.broadcast.emit('userMoved', {
        address: socket.userAddress,
        ...data
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected');
      if (socket.userAddress) {
        io.emit('userLeft', { address: socket.userAddress });
      }
    });
  });
};

module.exports = {
  setupSocketHandlers
}; 