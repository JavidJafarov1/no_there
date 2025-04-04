import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GameEngine } from '../services/GameEngine';
import { GameSocket } from '../services/GameSocket';

const Game: React.FC = () => {
  const { user, walletAddress, isAuthenticated } = useAuth();
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameSocket, setGameSocket] = useState<GameSocket | null>(null);
  const [isEngineLoaded, setIsEngineLoaded] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleResize = useCallback(() => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
      }
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check socket connection
    if (!isSocketConnected) {
      console.warn('Socket not connected - cannot sync movement with server');
      return;
    }

    // Check game engine and its readiness
    if (!window.gameEngine) {
      console.warn('Game engine not loaded - cannot process movement');
      return;
    }

    // Check if game engine is initialized
    if (!isEngineLoaded) {
      console.warn('Game engine not initialized yet');
      return;
    }

    // Check if game engine has required methods
    if (typeof window.gameEngine.getPlayerPosition !== 'function' || 
        typeof window.gameEngine.updatePlayerPosition !== 'function') {
      console.warn('Game engine missing required methods - cannot process movement');
      return;
    }

    const moveSpeed = 10;
    let dx = 0;
    let dy = 0;

    switch (event.key) {
      case 'ArrowUp':
        dy = -moveSpeed;
        break;
      case 'ArrowDown':
        dy = moveSpeed;
        break;
      case 'ArrowLeft':
        dx = -moveSpeed;
        break;
      case 'ArrowRight':
        dx = moveSpeed;
        break;
      default:
        return;
    }

    try {
      // Get current position from game engine
      const currentPosition = window.gameEngine.getPlayerPosition();
      if (!currentPosition) {
        console.warn('Could not get current position from game engine');
        return;
      }
      
      // Calculate new position with bounds checking
      const newPosition = {
        x: Math.max(0, Math.min(1000, currentPosition.x + dx)),
        y: Math.max(0, Math.min(1000, currentPosition.y + dy))
      };

      // Update position in game engine
      window.gameEngine.updatePlayerPosition(newPosition.x, newPosition.y);

      // Emit movement to server
      if (gameSocket?.isConnected()) {
        gameSocket.emit('userMovement', {
          position: newPosition,
          timestamp: Date.now()
        });
      } else {
        console.warn('Socket not connected, movement not synced');
      }
    } catch (error) {
      console.error('Error handling movement:', error);
      toast({
        title: 'Movement Error',
        description: 'Failed to update position',
        status: 'error',
        duration: 3000,
      });
    }
  }, [isSocketConnected, gameSocket, toast, isEngineLoaded]);

  useEffect(() => {
    if (!walletAddress) {
      navigate('/');
      return;
    }
  }, [walletAddress, navigate]);

  useEffect(() => {
    // Add event listeners
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleResize, handleKeyDown]);

  const leaveGame = async () => {
    // Disconnect socket
    if (gameSocket) {
      gameSocket.disconnect();
      setGameSocket(null);
    }

    // Cleanup game engine
    if (gameEngine) {
      gameEngine.cleanup();
      setGameEngine(null);
      setIsEngineLoaded(false);
    }
    setIsSocketConnected(false);

    // Clean up the canvas and observer
    const container = document.getElementById('game-container');
    if (container) {
      // Remove canvas
      const canvas = document.getElementById('canvas');
      if (canvas) {
        container.removeChild(canvas);
      }
    }

    // Remove all scripts
    const scriptsToRemove = document.querySelectorAll('script[data-game-script]');
    scriptsToRemove.forEach(script => script.remove());

    // Remove style
    const styleLink = document.querySelector('link[href="/style.css"]');
    if (styleLink) {
      styleLink.remove();
    }

    // Wait a bit to ensure cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const initializeGame = async () => {
    console.log('Starting game initialization...');
    try {
      // Clean up existing game state
      await leaveGame();
      
      // Create new canvas
      const container = document.getElementById('game-container');
      if (!container) {
        throw new Error('Game container not found');
      }

      const canvas = document.createElement('canvas');
      canvas.id = 'canvas';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);
      console.log('Canvas created and added to container');

      // Set initial canvas dimensions
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      canvas.width = containerWidth;
      canvas.height = containerHeight;

      // Add resize observer to handle container size changes
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === container) {
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            if (canvas) {
              canvas.width = entry.contentRect.width;
              canvas.height = entry.contentRect.height;
            }
          }
        }
      });
      resizeObserver.observe(container);

      // Load game engine script with cache busting
      console.log('Loading game engine script...');
      const timestamp = Date.now();

      // Load all required scripts in sequence
      const loadScript = async (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = src;
          script.type = 'text/javascript';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
          document.head.appendChild(script);
        });
      };

      // Load style.css first
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = '/style.css';
      document.head.appendChild(styleLink);

      try {
        // Load dependencies in order
        console.log('Loading dependencies...');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/gl-matrix/2.8.1/gl-matrix-min.js');
        await loadScript('https://cdn.socket.io/4.5.4/socket.io.min.js');
        
        // Load main game script with absolute path
        console.log('Loading main game script...');
        
        // First verify the file is accessible
        try {
          const response = await fetch('/artwork.js');
          if (!response.ok) {
            throw new Error(`Failed to fetch artwork.js: ${response.status} ${response.statusText}`);
          }
          const content = await response.text();
          console.log('Artwork.js content check:', {
            length: content.length,
            hasTimeClass: content.includes('class Time'),
            hasCirclesClass: content.includes('class ConvertedGLSLs_circles'),
            hasOPClass: content.includes('class OP'),
            firstFewChars: content.substring(0, 100)
          });

          // Create a script element to execute the content
          const scriptElement = document.createElement('script');
          scriptElement.type = 'text/javascript';
          
          // Wrap the content in an IIFE to ensure proper scope
          const wrappedContent = `
            (function(window) {
              ${content}
              // Export classes to window
              window.Time = Time;
              window.OP = OP;
              window.ConvertedGLSLs_circles = ConvertedGLSLs_circles;
            })(window);
          `;
          
          scriptElement.textContent = wrappedContent;
          document.head.appendChild(scriptElement);

          // Verify classes are available
          const checkClasses = () => {
            const timeClass = (window as any).Time;
            const circlesClass = (window as any).ConvertedGLSLs_circles;
            const opClass = (window as any).OP;
            
            console.log('Class availability check:', {
              Time: {
                exists: !!timeClass,
                type: typeof timeClass,
                constructor: timeClass?.toString?.()
              },
              ConvertedGLSLs_circles: {
                exists: !!circlesClass,
                type: typeof circlesClass,
                constructor: circlesClass?.toString?.()
              },
              OP: {
                exists: !!opClass,
                type: typeof opClass,
                constructor: opClass?.toString?.()
              }
            });

            return timeClass && circlesClass && opClass;
          };

          // Wait for classes to be available
          await new Promise<void>((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds total
            const interval = setInterval(() => {
              attempts++;
              if (checkClasses()) {
                clearInterval(interval);
                resolve();
              } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                reject(new Error('Required classes not found after script execution'));
              }
            }, 100);
          });

        } catch (error) {
          console.error('Failed to load artwork.js:', error);
          throw error;
        }

        // Initialize socket connection
        console.log('Initializing socket connection...');
        const socket = new GameSocket({
          serverUrl: 'http://localhost:3001',
          onConnect: () => {
            console.log('Socket connected successfully');
            setIsSocketConnected(true);
          },
          onDisconnect: (reason: string) => {
            console.log('Socket disconnected:', reason);
            setIsSocketConnected(false);
          },
          onError: (error: Error) => {
            console.error('Socket error:', error);
            setIsSocketConnected(false);
          },
        });

        socket.connect();
        setGameSocket(socket);

        // Now that we know the script is loaded and executed, initialize the engine
        console.log('Initializing game engine...');
        
        // Get WebGL2 context
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const gl = canvas.getContext('webgl2');
        if (!gl) {
          throw new Error('WebGL2 context not available');
        }

        // Create Time instance
        const time = new (window as any).Time();
        console.log('Time instance created');

        // Create game engine instance
        (window as any).gameEngine = new (window as any).ConvertedGLSLs_circles('gameEngine', time, gl);
        console.log('Game engine instance created');

        // Initialize required properties
        (window as any).gameEngine.par = {
          Multiplayerop: [{
            players: {},
            updatePlayer: (playerId: string, data: any) => {
              if (!(window as any).gameEngine.par.Multiplayerop[0].players) {
                (window as any).gameEngine.par.Multiplayerop[0].players = {};
              }
              (window as any).gameEngine.par.Multiplayerop[0].players[playerId] = data;
            }
          }],
          Avaop: [{
            loadedImages: new Map(),
            addImage: (id: string, data: any) => {
              if (!(window as any).gameEngine.par.Avaop[0].loadedImages) {
                (window as any).gameEngine.par.Avaop[0].loadedImages = new Map();
              }
              (window as any).gameEngine.par.Avaop[0].loadedImages.set(id, data);
            }
          }]
        };

        // Initialize the engine
        (window as any).gameEngine.doInit();
        console.log('Game engine initialized with doInit()');
          
        // Start animation loop
        if (!(window as any).animationStarted) {
          (window as any).animationStarted = true;
          (function animate() {
            time.update();
            if ((window as any).gameEngine) {
              (window as any).gameEngine.update();
            }
            requestAnimationFrame(animate);
          })();
          console.log('Animation loop started');
        }

        setIsEngineLoaded(true);
        toast({
          title: 'Game initialized successfully',
          status: 'success',
          duration: 3000,
        });

      } catch (error) {
        console.error('Game initialization failed:', error);
        setIsSocketConnected(false);
        setIsEngineLoaded(false);
        toast({
          title: 'Initialization Error',
          description: error instanceof Error ? error.message : 'Unknown error occurred',
          status: 'error',
          duration: 5000,
        });
        // Clean up on error
        await leaveGame();
      }

    } catch (error) {
      console.error('Game initialization failed:', error);
      setIsSocketConnected(false);
      setIsEngineLoaded(false);
      toast({
        title: 'Initialization Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'error',
        duration: 5000,
      });
      // Clean up on error
      await leaveGame();
    }
  };

  if (!walletAddress) {
    return (
      <Box p={4}>
        <VStack spacing={4}>
          <Text>Please connect your wallet to play</Text>
          <Button
            colorScheme="blue"
            onClick={() => navigate('/login')}
          >
            Connect Wallet
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" h="100vh" w="100%">
      <HStack justify="space-between" p={4}>
        <Text>
          Status: {isSocketConnected ? 'Connected' : 'Disconnected'}
        </Text>
        {isSocketConnected ? (
          <Button
            colorScheme="red"
            onClick={() => {
              leaveGame();
              navigate('/');
            }}
          >
            Leave Game
          </Button>
        ) : (
          <Button
            colorScheme="blue"
            onClick={initializeGame}
          >
            Join Game
          </Button>
        )}
      </HStack>

      <Box
        flex={1}
        bg={useColorModeValue('black', 'black')}
        id="game-container"
        position="relative"
        w="100%"
        h="calc(100vh - 100px)"
        display="flex"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        <style>
          {`
            #canvas {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              max-width: 100%;
              max-height: 100%;
            }
          `}
        </style>
      </Box>
    </VStack>
  );
};

export default Game; 