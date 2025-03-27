import React, { useEffect, useRef, useState } from 'react';
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
import { io, Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';

interface Player {
  address: string;
  position: { x: number; y: number };
}

const Game = () => {
  const { user, walletAddress, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState({
    players: {},
    position: { x: 0, y: 0 }
  });
  const gameLoopRef = useRef<number>();
  const keysRef = useRef<Set<string>>(new Set());
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Function to find the active backend server
    const findBackendServer = async () => {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost';
      const startPort = 3001;
      const maxPort = 3010; // We'll try ports 3001-3010

      for (let port = startPort; port <= maxPort; port++) {
        try {
          const response = await fetch(`${baseUrl}:${port}/health`);
          if (response.ok) {
            return `${baseUrl}:${port}`;
          }
        } catch (error) {
          continue;
        }
      }
      throw new Error('No available backend server found');
    };

    // Connect to the backend server
    findBackendServer()
      .then((serverUrl) => {
        const newSocket = io(serverUrl);
        setSocket(newSocket);

        newSocket.on('connect', () => {
          console.log('Connected to server');
          toast({
            title: 'Connected to game server',
            status: 'success',
            duration: 3000,
          });
          
          // Send authentication data to server
          newSocket.emit('authenticate', {
            userId: user?.uid || 'anonymous',
            walletAddress: walletAddress || undefined,
            email: user?.email || undefined
          });
        });

        newSocket.on('gameState', (state) => {
          setGameState(state);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          toast({
            title: 'Connection error',
            description: 'Failed to connect to game server',
            status: 'error',
            duration: 3000,
          });
        });

        newSocket.on('userMoved', (data: Player) => {
          setPlayers((prevPlayers) => {
            const existingPlayerIndex = prevPlayers.findIndex(
              (p) => p.address === data.address
            );
            if (existingPlayerIndex >= 0) {
              const newPlayers = [...prevPlayers];
              newPlayers[existingPlayerIndex] = data;
              return newPlayers;
            }
            return [...prevPlayers, data];
          });
        });

        newSocket.on('userLeft', (data: { address: string }) => {
          setPlayers((prevPlayers) =>
            prevPlayers.filter((p) => p.address !== data.address)
          );
        });

        return () => {
          newSocket.disconnect();
        };
      })
      .catch((error) => {
        console.error('Server connection error:', error);
        toast({
          title: 'Server error',
          description: 'Could not find an available game server',
          status: 'error',
          duration: 3000,
        });
      });
  }, [isAuthenticated, user, walletAddress, navigate, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const gameLoop = () => {
      if (!socket) return;

      const keys = Array.from(keysRef.current);
      if (keys.length > 0) {
        socket.emit('playerMove', { keys });
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [socket]);

  if (!isAuthenticated) {
    return (
      <Box p={4}>
        <Text>Please sign in or connect your wallet to play</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" h="calc(100vh - 80px)">
      <HStack justify="space-between">
        <Text fontSize="xl">Players Online: {players.length}</Text>
        <Button
          colorScheme="red"
          onClick={() => {
            if (socket) {
              socket.disconnect();
            }
            navigate('/');
          }}
        >
          Leave Game
        </Button>
      </HStack>

      <Box
        flex={1}
        bg={useColorModeValue('gray.100', 'gray.700')}
        rounded="md"
        overflow="hidden"
      >
        <canvas
          width={800}
          height={600}
          style={{ width: '100%', height: '100%' }}
        />
      </Box>

      <Text fontSize="sm" textAlign="center" color="gray.500">
        Use arrow keys to move your character
      </Text>
    </VStack>
  );
};

export default Game; 