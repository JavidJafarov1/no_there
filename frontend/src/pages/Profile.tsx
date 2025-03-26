import React, { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { useAccount } from 'wagmi';

interface UserProfile {
  wallet_address: string;
  username: string;
  created_at: string;
  games_played: number;
  total_time: number;
}

const Profile = () => {
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!address) return;

      try {
        const response = await fetch(`/api/user/${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isConnected && address) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [address, isConnected]);

  if (!isConnected) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="xl">Please connect your wallet to view your profile</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="xl">Loading profile...</Text>
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="xl">Profile not found</Text>
      </Box>
    );
  }

  return (
    <Box maxW="4xl" mx="auto" p={6}>
      <VStack spacing={8} align="stretch">
        <HStack spacing={6}>
          <Avatar size="xl" name={profile.username || profile.wallet_address} />
          <VStack align="start" spacing={1}>
            <Text fontSize="2xl" fontWeight="bold">
              {profile.username || 'Anonymous'}
            </Text>
            <Text color="gray.500" fontSize="sm">
              {profile.wallet_address}
            </Text>
          </VStack>
        </HStack>

        <Divider />

        <HStack spacing={8} justify="space-around">
          <Stat>
            <StatLabel>Games Played</StatLabel>
            <StatNumber>{profile.games_played}</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              Last 30 days
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Total Play Time</StatLabel>
            <StatNumber>{Math.round(profile.total_time / 60)}h</StatNumber>
            <StatHelpText>
              <StatArrow type="increase" />
              Last 30 days
            </StatHelpText>
          </Stat>

          <Stat>
            <StatLabel>Member Since</StatLabel>
            <StatNumber>
              {new Date(profile.created_at).toLocaleDateString()}
            </StatNumber>
            <StatHelpText>Account age</StatHelpText>
          </Stat>
        </HStack>

        <Box
          p={6}
          bg={useColorModeValue('white', 'gray.800')}
          rounded="lg"
          shadow="md"
        >
          <Text fontSize="lg" fontWeight="bold" mb={4}>
            Recent Activity
          </Text>
          <VStack align="start" spacing={2}>
            <Text>No recent activity to display</Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
};

export default Profile; 