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

const Game = () => {
  const { user, walletAddress, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Create canvas element first
    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    const container = document.getElementById('game-container');
    if (container) {
      container.appendChild(canvas);
    }

    // Check if script is already loaded
    if (!document.getElementById('game-engine-script')) {
      // Load style.css
      const style = document.createElement('link');
      style.rel = 'stylesheet';
      style.href = '/style.css';
      document.head.appendChild(style);

      // Load artwork.js with proper ID and error handling
      const script = document.createElement('script');
      script.id = 'game-engine-script';  // Add ID to prevent duplicate loading
      script.src = '/artwork.js';
      script.async = true;
      
      script.onerror = (e) => {
        console.error('Error loading artwork.js:', e);
        toast({
          title: 'Error loading game engine',
          description: 'Could not load artwork.js. Please check if the file is in the correct location.',
          status: 'error',
          duration: 5000,
        });
      };

      script.onload = () => {
        console.log('Game engine loaded successfully');
        toast({
          title: 'Game engine loaded',
          status: 'success',
          duration: 3000,
        });
      };

      document.body.appendChild(script);
    }

    return () => {
      // Only remove elements if they exist
      const style = document.querySelector('link[href="/style.css"]');
      const script = document.getElementById('game-engine-script');
      
      if (style) document.head.removeChild(style);
      if (script) document.body.removeChild(script);
      if (container && canvas) {
        container.removeChild(canvas);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const findBackendServer = async () => {
      try {
        console.log('Checking server connection...');
        const response = await fetch('http://localhost:3001/health', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        return 'http://localhost:3001';
      } catch (error) {
        console.error('Server connection error:', error);
        throw error;
      }
    };

    const initSocket = async () => {
      try {
        const serverUrl = await findBackendServer();
        // Make sure socket.io-client is imported
        const socket = io(serverUrl, {
          withCredentials: true,
          transports: ['websocket'],
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        socket.on('connect', () => {
          console.log('Socket connected successfully');
        });

        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
        });

        setSocket(socket);
      } catch (error) {
        console.error('Failed to initialize socket:', error);
      }
    };

    initSocket();
  }, []);

  if (!isAuthenticated) {
    return (
      <Box p={4}>
        <Text>Please sign in or connect your wallet to play</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={4} align="stretch" h="100vh">
      <HStack justify="flex-end" p={4}>
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
        bg={useColorModeValue('black', 'black')}
        id="game-container"
        position="relative"
      />
    </VStack>
  );
};

export default Game; 