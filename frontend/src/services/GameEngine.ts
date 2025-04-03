import { Toast } from '@chakra-ui/react';

interface GameEngineConfig {
  containerId: string;
  socketioScriptUrl: string;
  gameScriptUrl: string;
  styleUrl: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}

export class GameEngine {
  private isLoaded: boolean = false;
  private config: GameEngineConfig;
  private socketioScriptId = 'socketio-script';
  private gameEngineScriptId = 'game-engine-script';

  constructor(config: GameEngineConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    try {
      await this.loadSocketIO();
      await this.loadGameEngine();
      this.isLoaded = true;
      this.config.onSuccess();
      return true;
    } catch (error) {
      this.config.onError(error as Error);
      return false;
    }
  }

  private async loadSocketIO(): Promise<void> {
    if (document.getElementById(this.socketioScriptId)) {
      return;
    }

    await this.loadScript(
      this.socketioScriptId,
      this.config.socketioScriptUrl,
      'Failed to load Socket.IO client'
    );
  }

  private async loadGameEngine(): Promise<void> {
    await this.setupCanvas();
    await this.loadStyle();
    await this.loadGameScript();
  }

  private async setupCanvas(): Promise<void> {
    const container = document.getElementById(this.config.containerId);
    if (!container) {
      throw new Error('Game container not found');
    }

    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    container.appendChild(canvas);
  }

  private async loadStyle(): Promise<void> {
    const style = document.createElement('link');
    style.rel = 'stylesheet';
    style.href = this.config.styleUrl;
    document.head.appendChild(style);
  }

  private async loadGameScript(): Promise<void> {
    if (document.getElementById(this.gameEngineScriptId)) {
      return;
    }

    await this.loadScript(
      this.gameEngineScriptId,
      this.config.gameScriptUrl,
      'Failed to load game engine'
    );
  }

  private loadScript(id: string, src: string, errorMessage: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;

      script.onload = () => resolve();
      script.onerror = () => reject(new Error(errorMessage));

      document.body.appendChild(script);
    });
  }

  cleanup(): void {
    const elements = [
      document.querySelector('link[href="/style.css"]'),
      document.getElementById(this.gameEngineScriptId),
      document.getElementById(this.socketioScriptId),
      document.getElementById('canvas')
    ];

    elements.forEach(element => element?.parentNode?.removeChild(element));
    this.isLoaded = false;
  }

  isEngineLoaded(): boolean {
    return this.isLoaded;
  }
} 