/**
 * Type definitions for artwork.js classes
 */
declare global {
  interface Window {
    Time: any;
    OP: any;
    ConvertedGLSLs_circles: any;
    ConvertedGLSLs_prizes: any;
    gameEngine: {
      update: () => void;
      doInit: () => void;
      getPlayerPosition: () => { x: number; y: number };
      updatePlayerPosition: (x: number, y: number) => void;
      updatePlayers: (players: Record<string, any>) => void;
      addPlayer: (id: string, position: { x: number; y: number }) => void;
      removePlayer: (id: string) => void;
      updatePrizes: (prizes: Record<string, any>) => void;
      addPrize: (prize: any) => void;
      removePrize: (prizeId: string) => void;
      showPrizeClaimed: (prize: any) => void;
      par: {
        Multiplayerop: Array<{
          players: Record<string, any>;
          updatePlayer: (playerId: string, data: any) => void;
        }>;
        Avaop: Array<{
          loadedImages: Map<string, any>;
          addImage: (id: string, data: any) => void;
        }>;
      };
      sprites: Array<{
        id: string;
        x: number;
        y: number;
        size: number;
        r: number;
        g: number;
        b: number;
        startU?: number;
        startV?: number;
        endU?: number;
        endV?: number;
      }>;
    };
    prizesEngine: {
      update: () => void;
      doInit: () => void;
      par: {
        PrizesOp: Array<{
          prizes: Record<string, any>;
          updatePrize: (prizeId: string, data: any) => void;
        }>;
      };
      sprites: Array<{
        id: string;
        x: number;
        y: number;
        size: number;
        type: string;
        value: number;
        r: number;
        g: number;
        b: number;
      }>;
    };
    animationStarted: boolean;
  }
}

export {};
