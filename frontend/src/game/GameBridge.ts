import { Socket } from 'socket.io-client';

interface Player {
  address: string;
  position: { x: number; y: number };
  // Add any other player properties from your engine
}

declare global {
  interface Window {
    gameEngine: any; // Your existing game engine
  }
}

export class GameBridge {
  private socket: Socket;
  private gameEngine: any; // Your existing game engine
  private userId: string;

  constructor(socket: Socket, userId: string) {
    this.socket = socket;
    this.userId = userId;

    // Initialize event listeners for socket events
    this.initializeSocketEvents();
  }

  public initialize() {
    // Wait for the game engine to be available on window
    const checkEngine = () => {
      if (window.gameEngine) {
        this.gameEngine = window.gameEngine;
        this.connectEngineWithSocket();
      } else {
        setTimeout(checkEngine, 100);
      }
    };
    checkEngine();
  }

  private initializeSocketEvents() {
    // Listen for player movements from other clients
    this.socket.on('userMoved', (data: Player) => {
      if (data.address !== this.userId && this.gameEngine) {
        // Update other player's position in your game engine
        this.gameEngine.updatePlayerPosition(data.address, data.position);
      }
    });

    // Listen for player disconnections
    this.socket.on('userLeft', (data: { address: string }) => {
      if (this.gameEngine) {
        // Remove player from your game engine
        this.gameEngine.removePlayer(data.address);
      }
    });

    // Handle new player connections
    this.socket.on('newPlayer', (data: Player) => {
      if (this.gameEngine && data.address !== this.userId) {
        // Add new player to your game engine
        this.gameEngine.addPlayer(data.address, data.position);
      }
    });
  }

  private connectEngineWithSocket() {
    // Hook into your game engine's update/movement system
    const originalUpdatePosition = this.gameEngine.updatePosition;
    this.gameEngine.updatePosition = (...args: any[]) => {
      // Call the original update method
      originalUpdatePosition.apply(this.gameEngine, args);

      // Get the current player position from your engine
      const position = this.gameEngine.getPlayerPosition();

      // Emit the position to other players
      this.socket.emit('userMovement', {
        position,
        timestamp: Date.now()
      });
    };

    // Initialize the current player in your engine
    this.gameEngine.initializePlayer(this.userId);
  }

  public cleanup() {
    // Cleanup any event listeners or intervals
    if (this.gameEngine) {
      // Restore original methods if needed
      // Add any necessary cleanup from your engine
    }
  }
} 