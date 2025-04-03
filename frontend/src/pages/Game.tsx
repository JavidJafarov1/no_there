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

    return () => {
      engine.cleanup();
      setIsEngineLoaded(false);
    };
  }, [isAuthenticated, navigate, toast]);

  useEffect(() => {
    if (!isAuthenticated || !isEngineLoaded) return;

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

    return () => {
      socket.disconnect();
      setIsSocketConnected(false);
    };
  }, [isAuthenticated, isEngineLoaded, toast]);

  if (!isAuthenticated) {
    return (
      <Box p={4}>
        <Text>Please sign in or connect your wallet to play</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" h="100vh">
      <HStack justify="space-between" p={4}>
        <Text>
          Status: {isSocketConnected ? 'Connected' : 'Disconnected'}
        </Text>
        <Button
          colorScheme="red"
          onClick={() => {
            gameSocket?.disconnect();
            navigate('/');
          }}
        >
          Leave Game
        </Button>
      </HStack>

      <Box
        flex={1}
        bg={useColorModeValue('black', 'black')}
        id="game-container"
        position="relative"
      />
    </VStack>
  );
};

export default Game; 