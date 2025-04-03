import { Socket, io } from 'socket.io-client';

interface GameSocketConfig {
  serverUrl: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onError: (error: Error) => void;
}

export class GameSocket {
  private socket: Socket | null = null;
  private config: GameSocketConfig;

  constructor(config: GameSocketConfig) {
    this.config = config;
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.config.serverUrl, {
      withCredentials: true,
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.config.onConnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.config.onError(error);
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.config.onDisconnect();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }
} 