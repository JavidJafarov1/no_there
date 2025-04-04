import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }
  }, [isAuthenticated, navigate]);

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
      // Clean up any existing game state
      await leaveGame();

      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Load socket.io script
      const socketioScript = document.createElement('script');
      socketioScript.id = 'socketio-script';
      socketioScript.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
      await new Promise((resolve, reject) => {
        socketioScript.onload = resolve;
        socketioScript.onerror = reject;
        document.head.appendChild(socketioScript);
      });

      // Load game engine script
      const gameScript = document.createElement('script');
      gameScript.id = 'game-engine-script';
      gameScript.src = '/artwork.js';
      await new Promise((resolve, reject) => {
        gameScript.onload = resolve;
        gameScript.onerror = reject;
        document.head.appendChild(gameScript);
      });

      // Load style
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = '/style.css';
      document.head.appendChild(styleLink);

      // Wait for scripts to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      const engine = new GameEngine({
        containerId: 'game-container',
        socketioScriptUrl: 'https://cdn.socket.io/4.5.4/socket.io.min.js',
        gameScriptUrl: '/artwork.js',
        styleUrl: '/style.css',
        onError: (error) => {
          toast({
            title: 'Error loading game engine',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        },
        onSuccess: () => {
          setIsEngineLoaded(true);
          toast({
            title: 'Game engine loaded',
            status: 'success',
            duration: 3000,
          });
        },
      });
      engine.initialize();
      setGameEngine(engine);

      const socket = new GameSocket({
        serverUrl: 'http://localhost:3001',
        onConnect: () => {
          setIsSocketConnected(true);
          toast({
            title: 'Connected to game server',
            status: 'success',
            duration: 3000,
          });
        },
        onDisconnect: () => {
          setIsSocketConnected(false);
          toast({
            title: 'Disconnected from server',
            status: 'warning',
            duration: 3000,
          });
        },
        onError: (error) => {
          setIsSocketConnected(false);
          toast({
            title: 'Connection error',
            description: error.message,
            status: 'error',
            duration: 5000,
            isClosable: true,
          });
        },
      });
      socket.connect();
      setGameSocket(socket);
    } catch (error) {
      console.error('Error initializing game:', error);
      toast({
        title: 'Error initializing game',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <Box p={4}>
        <Text>Please sign in or connect your wallet to play</Text>
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