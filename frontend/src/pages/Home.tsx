import React from 'react';
import {
  Box,
  Heading,
  Text,
  Button,
  VStack,
  SimpleGrid,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { FaEthereum, FaUsers, FaLock } from 'react-icons/fa';

const Feature = ({ title, text, icon }: { title: string; text: string; icon: React.ElementType }) => {
  return (
    <VStack
      align="start"
      p={6}
      bg={useColorModeValue('white', 'gray.800')}
      rounded="xl"
      border="1px"
      borderColor={useColorModeValue('gray.200', 'gray.700')}
      _hover={{ shadow: 'lg' }}
      transition="all 0.3s"
    >
      <Icon as={icon} w={10} h={10} color="blue.500" />
      <Text fontWeight="bold" fontSize="lg">
        {title}
      </Text>
      <Text color={useColorModeValue('gray.600', 'gray.400')}>{text}</Text>
    </VStack>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { login, authenticated } = usePrivy();

  return (
    <Box maxW="7xl" mx="auto" px={{ base: 4, sm: 6, lg: 8 }} py={12}>
      <VStack spacing={8} align="center">
        <Heading
          as="h1"
          size="2xl"
          textAlign="center"
          bgGradient="linear(to-r, blue.500, purple.500)"
          bgClip="text"
        >
          Welcome to No There
        </Heading>
        <Text fontSize="xl" textAlign="center" maxW="3xl">
          Experience the future of online gaming with blockchain integration, real-time multiplayer
          interactions, and immersive gameplay.
        </Text>
        {authenticated ? (
          <Button
            size="lg"
            colorScheme="blue"
            onClick={() => navigate('/game')}
          >
            Start Playing
          </Button>
        ) : (
          <Button
            size="lg"
            colorScheme="blue"
            onClick={login}
          >
            Connect to Play
          </Button>
        )}
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} mt={16}>
        <Feature
          title="Blockchain Integration"
          text="Connect with your wallet or email for secure authentication and seamless gameplay."
          icon={FaEthereum}
        />
        <Feature
          title="Real-time Multiplayer"
          text="Play with other players in real-time with smooth synchronization and minimal latency."
          icon={FaUsers}
        />
        <Feature
          title="Secure & Scalable"
          text="Built with modern technologies ensuring security and scalability for a growing player base."
          icon={FaLock}
        />
      </SimpleGrid>
    </Box>
  );
};

export default Home; 