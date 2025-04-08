import { useState, useEffect } from "react";
import {
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Flex,
  Icon,
  Divider,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from "@chakra-ui/react";
import { FaTwitter } from "react-icons/fa";
import { SiTiktok } from "react-icons/si";
import { socialAccountApi, SocialAccount } from "../services/api";

/**
 * Social platform configuration
 */
const PLATFORMS = {
  twitter: {
    name: "Twitter",
    icon: FaTwitter,
    color: "#1DA1F2",
  },
  farcaster: {
    name: "Farcaster",
    icon: ({ color, size }: { color?: string; size?: number }) => (
      <svg
        width={size || 24}
        height={size || 24}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M11.01 3.15L2.53 7.9C2.52 7.9 2.51 7.91 2.5 7.91C1.43 8.45 1.43 15.54 2.5 16.09C2.51 16.09 2.52 16.1 2.53 16.1L11.01 20.85C11.01 20.85 11.03 20.85 11.03 20.86C11.63 21.15 21.59 21.13 21.61 16.16C21.61 16.14 21.62 16.12 21.62 16.1L11.03 3.15C11.03 3.15 11.02 3.15 11.01 3.15Z"
          fill={color || "#7A3AF3"}
        />
      </svg>
    ),
    color: "#7A3AF3",
  },
  tiktok: {
    name: "TikTok",
    icon: SiTiktok,
    color: "#000000",
  },
};

type PlatformKey = keyof typeof PLATFORMS;

/**
 * Component for connecting social media accounts
 */
const SocialAccountsConnect = () => {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState<Record<PlatformKey, boolean>>({
    twitter: false,
    farcaster: false,
    tiktok: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchAccounts();
  }, []);

  /**
   * Fetches all social accounts for the current user
   */
  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      const data = await socialAccountApi.getAccounts();
      setAccounts(data);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to load social accounts",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Initiates verification process for a social account
   */
  const handleVerify = async (platform: PlatformKey) => {
    try {
      setLoading({ ...loading, [platform]: true });
      await socialAccountApi.startVerification(platform);

      // In a real implementation, this would redirect to OAuth flow
      // For demo purposes, we'll simulate a successful verification
      await simulateSuccessfulVerification(platform);

      toast({
        title: "Success",
        description: `${PLATFORMS[platform].name} account connected successfully!`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });

      fetchAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : `Failed to verify ${platform}`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading({ ...loading, [platform]: false });
    }
  };

  /**
   * Simulates a successful verification (for demo purposes)
   * In a real implementation, this would be handled by the OAuth callback
   */
  const simulateSuccessfulVerification = async (platform: PlatformKey) => {
    // This would normally be provided by the OAuth callback
    const mockData = {
      twitter: {
        platformUserId: "twitter123",
        username: "twitterUser",
        profileUrl: "https://twitter.com/user",
      },
      farcaster: {
        platformUserId: "farcaster456",
        username: "farcasterUser",
        profileUrl: "https://farcaster.xyz/user",
      },
      tiktok: {
        platformUserId: "tiktok789",
        username: "tiktokUser",
        profileUrl: "https://tiktok.com/@user",
      },
    };

    const { platformUserId, username, profileUrl } = mockData[platform];

    await socialAccountApi.confirmVerification(
      platform,
      platformUserId,
      username,
      profileUrl
    );
  };

  /**
   * Disconnects a social account
   */
  const handleDisconnect = async (accountId: string, platform: string) => {
    try {
      await socialAccountApi.deleteAccount(accountId);

      toast({
        title: "Account Disconnected",
        description: `Your ${platform} account has been disconnected.`,
        status: "info",
        duration: 5000,
        isClosable: true,
      });

      fetchAccounts();
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to disconnect account",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  /**
   * Checks if a platform is already connected
   */
  const isConnected = (platform: PlatformKey) => {
    return accounts.some(
      (account) => account.platform === platform && account.verified
    );
  };

  /**
   * Gets the account ID for a platform if connected
   */
  const getAccountId = (platform: PlatformKey) => {
    const account = accounts.find((acc) => acc.platform === platform);
    return account?.id;
  };

  return (
    <>
      <Button colorScheme="blue" onClick={onOpen}>
        Connect Social Accounts
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="md">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect your social accounts</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text mb={4}>
              Verified social accounts appear on your public profile and let
              users verify who you are. To complete your profile, please connect
              at least one (1) social account.
            </Text>

            <VStack spacing={4} align="stretch" mt={6}>
              {(Object.keys(PLATFORMS) as PlatformKey[]).map((platform) => {
                const connected = isConnected(platform);
                const accountId = getAccountId(platform);
                const { name, icon, color } = PLATFORMS[platform];

                return (
                  <Box key={platform}>
                    <Flex justify="space-between" align="center" py={2}>
                      <Flex align="center">
                        <Icon as={icon} color={color} boxSize={6} mr={3} />
                        <Text fontWeight="medium">Verify {name}</Text>
                      </Flex>

                      {connected ? (
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="red"
                          onClick={() =>
                            handleDisconnect(accountId as string, name)
                          }
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          isLoading={loading[platform]}
                          onClick={() => handleVerify(platform)}
                        >
                          Connect
                        </Button>
                      )}
                    </Flex>
                    {platform !== "tiktok" && <Divider />}
                  </Box>
                );
              })}
            </VStack>

            <Flex justify="center" mt={8}>
              <Button colorScheme="gray" onClick={onClose}>
                Finish
              </Button>
            </Flex>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default SocialAccountsConnect;
