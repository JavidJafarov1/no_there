/**
 * Generate random movement data for testing
 */
function generateMovement(context, events, done) {
  // Get the previous position or initialize at a random position
  const prevX = context.vars.prevX || Math.floor(Math.random() * 900) + 50;
  const prevY = context.vars.prevY || Math.floor(Math.random() * 900) + 50;

  // Generate a small movement (max 5 units in any direction)
  const deltaX = Math.random() * 10 - 5;
  const deltaY = Math.random() * 10 - 5;

  // Calculate new position
  const newX = Math.max(0, Math.min(1000, prevX + deltaX));
  const newY = Math.max(0, Math.min(1000, prevY + deltaY));

  // Save the new position
  context.vars.prevX = newX;
  context.vars.prevY = newY;

  // Create movement data
  context.vars.movement = {
    position: {
      x: newX,
      y: newY,
    },
    timestamp: Date.now(),
  };

  return done();
}

/**
 * Generate a random wallet address for testing
 */
function generateWallet(context, events, done) {
  // Generate a random address-like string
  const chars = "0123456789abcdef";
  let wallet = "0x";

  // Ethereum addresses are 42 chars (0x + 40 hex chars)
  for (let i = 0; i < 40; i++) {
    wallet += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Store for potential reuse and return
  context.vars.wallet = wallet;

  return { address: wallet };
}

/**
 * Handle events during test execution
 */
function handleEvents(context, events, done) {
  // Setup event handlers
  context.on("error", (error) => {
    console.error("Socket error:", error);
  });

  context.on("reconnect", () => {
    console.log("Socket reconnected");
  });

  return done();
}

module.exports = {
  generateMovement,
  generateWallet,
  handleEvents,
};
