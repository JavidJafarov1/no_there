import { Socket, io } from "socket.io-client";

interface GameSocketConfig {
  serverUrl: string;
  onConnect: () => void;
  onDisconnect: (reason: string) => void;
  onError: (error: Error) => void;
}

export class GameSocket {
  public socket: Socket | null = null;
  private config: GameSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout = 1000;
  private _isAuthenticated = false;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(config: GameSocketConfig) {
    this.config = config;
  }

  connect(): void {
    console.log("Attempting to connect to socket server...");
    if (this.socket?.connected) {
      console.log("Socket already connected, skipping connection attempt");
      return;
    }

    this.socket = io(this.config.serverUrl, {
      withCredentials: true,
      transports: ["websocket"],
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectTimeout,
      timeout: 20000,
    });

    console.log("Socket instance created, setting up event listeners...");
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) {
      console.error("Cannot setup event listeners: socket is null");
      return;
    }

    this.socket.on("connect", () => {
      console.log("Socket connected successfully, socket ID:", this.socket?.id);
      this.reconnectAttempts = 0;
      // Auto-authenticate on connect
      this._isAuthenticated = true;
      this.config.onConnect();

      // Start ping interval
      this.pingInterval = setInterval(() => {
        if (this.socket?.connected) {
          console.log("Sending ping to server...");
          this.socket.emit("ping");
        }
      }, 20000);
    });

    this.socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      this.config.onError(error);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected. Reason:", reason);
      this._isAuthenticated = false;
      this.config.onDisconnect(reason);

      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      if (reason === "io server disconnect" || reason === "transport close") {
        console.log("Attempting to reconnect...");
        setTimeout(() => {
          if (!this.socket?.connected) {
            this.socket?.connect();
          }
        }, this.reconnectTimeout);
      }
    });

    this.socket.on("error", (error) => {
      console.error("Socket error:", error);
      this.config.onError(error);
    });

    this.socket.on("reconnect_attempt", (attemptNumber) => {
      this.reconnectAttempts = attemptNumber;
      console.log(
        `Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`
      );
    });

    this.socket.on("reconnect_failed", () => {
      console.error("Failed to reconnect after all attempts");
      this.config.onError(new Error("Failed to reconnect to server"));
    });

    // Game-specific event handlers
    this.socket.on("players_update", (players) => {
      console.log("Received players update:", players);
      if (!window.gameEngine) {
        console.warn("Game engine not available for players update");
        return;
      }
      if (typeof window.gameEngine.updatePlayers === "function") {
        window.gameEngine.updatePlayers(players);
      } else {
        console.error("Game engine missing updatePlayers method");
      }
    });

    this.socket.on("userMoved", (data) => {
      console.log("Received player movement:", data);
      if (!window.gameEngine) {
        console.warn("Game engine not available for player movement");
        return;
      }
      if (typeof window.gameEngine.updatePlayerPosition === "function") {
        window.gameEngine.updatePlayerPosition(data.id, data.position);
      } else {
        console.error("Game engine missing updatePlayerPosition method");
      }
    });

    this.socket.on("newPlayer", (data) => {
      console.log("New player joined:", data);
      if (!window.gameEngine) {
        console.warn("Game engine not available for new player");
        return;
      }
      if (typeof window.gameEngine.addPlayer === "function") {
        window.gameEngine.addPlayer(data.id, data.position);
      } else {
        console.error("Game engine missing addPlayer method");
      }
    });

    this.socket.on("userLeft", (data) => {
      console.log("Player left:", data);
      if (!window.gameEngine) {
        console.warn("Game engine not available for player removal");
        return;
      }
      if (typeof window.gameEngine.removePlayer === "function") {
        window.gameEngine.removePlayer(data.id);
      } else {
        console.error("Game engine missing removePlayer method");
      }
    });

    console.log("All socket event listeners set up successfully");
  }

  disconnect(): void {
    console.log("Disconnecting socket...");
    if (this.socket) {
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      this.socket.disconnect();
      this.socket = null;
      this.reconnectAttempts = 0;
      this._isAuthenticated = false;
      console.log("Socket disconnected successfully");
    }
  }

  isConnected(): boolean {
    const connected = this.socket?.connected ?? false;
    console.log("Checking socket connection status:", connected);
    return connected;
  }

  public isAuthenticated(): boolean {
    // Always return true since we're removing authentication
    return true;
  }

  public getSocketId(): string | undefined {
    return this.socket?.id;
  }

  emit(event: string, data: any): void {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot emit event:", event);
      return;
    }
    // Remove authentication check
    try {
      console.log("Emitting event:", event, "with data:", data);
      this.socket.emit(event, data);
    } catch (error) {
      console.error("Error emitting event:", error);
      this.config.onError(error as Error);
    }
  }

  on(event: string, callback: (data: any) => void): void {
    console.log("Setting up listener for event:", event);
    this.socket?.on(event, callback);
  }
}
