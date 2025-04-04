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

    // Check game engine
    if (!window.gameEngine) {
      console.warn('Game engine not loaded - cannot process movement');
      return;
    }

    // Check if game engine has required methods
    if (!window.gameEngine.getPlayerPosition || !window.gameEngine.updatePlayerPosition) {
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
  }, [isSocketConnected, gameSocket, toast]);

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
    if (gameSocket) {
      gameSocket.disconnect();
      setGameSocket(null);
    }
    if (gameEngine) {
      gameEngine.cleanup();
      setGameEngine(null);
      setIsEngineLoaded(false);
    }
    setIsSocketConnected(false);

    // Clean up the canvas element
    const container = document.getElementById('game-container');
    if (container) {
      const canvas = document.getElementById('canvas');
      if (canvas) {
        container.removeChild(canvas);
      }
    }

    // Remove all scripts and wait for them to be removed
    const scriptsToRemove = [
      document.getElementById('game-engine-script'),
      document.getElementById('socketio-script'),
      document.querySelector('link[href="/style.css"]')
    ];

    scriptsToRemove.forEach(script => {
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    });

    // Wait a bit to ensure scripts are fully removed
    await new Promise(resolve => setTimeout(resolve, 100));
  };

  const initializeGame = async () => {
    try {
      // Prevent multiple initializations
      if (isEngineLoaded || isSocketConnected) {
        console.log('Game already initialized');
        return;
      }

      console.log('Starting game initialization...');
      console.log('Current auth state:', {
        walletAddress,
        isSocketConnected
      });

      // Clean up any existing game state
      await leaveGame();
      console.log('Previous game state cleaned up');

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create and setup canvas first
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

      // Load socket.io script
      console.log('Loading socket.io script...');
      const socketioScript = document.createElement('script');
      socketioScript.id = 'socketio-script';
      socketioScript.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
      await new Promise((resolve, reject) => {
        socketioScript.onload = () => {
          console.log('Socket.io script loaded successfully');
          resolve(true);
        };
        socketioScript.onerror = (error) => {
          console.error('Failed to load socket.io script:', error);
          reject(error);
        };
        document.head.appendChild(socketioScript);
      });

      // Initialize socket first
      console.log('Initializing socket connection...');
      const socket = new GameSocket({
        serverUrl: 'http://localhost:3001',
        onConnect: () => {
          console.log('Socket connected, authenticating...');
          // Only send wallet address for authentication
          socket.emit('authenticate', {
            address: walletAddress
          });
        },
        onDisconnect: (reason: string) => {
          console.log('Socket disconnected:', reason);
          setIsSocketConnected(false);
          toast({
            title: 'Disconnected from server',
            description: `Reason: ${reason}`,
            status: 'warning',
            duration: 3000,
          });
        },
        onError: (error) => {
          console.error('Socket error:', error);
          setIsSocketConnected(false);
          toast({
            title: 'Connection error',
            description: error.message,
            status: 'error',
            duration: 5000,
          });
        },
      });

      // Connect socket
      socket.connect();
      setGameSocket(socket);

      // Wait for socket connection and authentication
      console.log('Waiting for socket connection and authentication...');
      await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        const checkSocket = () => {
          attempts++;
          const isConnected = socket.isConnected();
          const isAuthenticated = socket.isAuthenticated();
          
          console.log(`Connection check attempt ${attempts}/${maxAttempts}:`, {
            isConnected,
            isAuthenticated
          });

          if (isConnected && isAuthenticated) {
            console.log('Socket connected and authenticated successfully');
            setIsSocketConnected(true);
            toast({
              title: 'Connected to game server',
              status: 'success',
              duration: 3000,
            });
            resolve(true);
          } else if (attempts >= maxAttempts) {
            const error = new Error(
              `Socket connection timed out. Connection: ${isConnected}, Authentication: ${isAuthenticated}`
            );
            console.error(error);
            reject(error);
          } else {
            setTimeout(checkSocket, 100);
          }
        };
        checkSocket();
      });

      // Load game engine script
      console.log('Loading game engine script...');
      const gameScript = document.createElement('script');
      const uniqueId = Date.now();
      gameScript.id = `game-engine-script-${uniqueId}`;
      gameScript.src = `/artwork.js?t=${uniqueId}`; // Add timestamp to prevent caching
      await new Promise((resolve, reject) => {
        gameScript.onload = () => {
          console.log('Game engine script loaded successfully');
          resolve(true);
        };
        gameScript.onerror = (error) => {
          console.error('Failed to load game engine script:', error);
          reject(error);
        };
        document.head.appendChild(gameScript);
      });

      // Load style
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = '/style.css';
      document.head.appendChild(styleLink);

      // Wait for game engine initialization
      console.log('Waiting for game engine initialization...');
      await new Promise((resolve) => {
        const checkGameEngine = () => {
          if (window.gameEngine && 
              typeof window.gameEngine.getPlayerPosition === 'function' &&
              typeof window.gameEngine.updatePlayerPosition === 'function') {
            console.log('Game engine initialized successfully');
            resolve(true);
          } else {
            setTimeout(checkGameEngine, 100);
          }
        };
        checkGameEngine();
      });

      // Initialize game engine
      console.log('Initializing game engine...');
      if (window.gameEngine) {
        window.gameEngine.initialize();
        setIsEngineLoaded(true);
        console.log('Game engine initialized successfully');
      } else {
        throw new Error('Game engine not available after initialization');
      }

    } catch (error) {
      console.error('Error initializing game:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Initialization Error',
        description: errorMessage,
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