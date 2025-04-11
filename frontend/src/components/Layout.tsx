import { Box, Flex, Button, useColorModeValue, Container, Menu, MenuButton, MenuList, MenuItem, Avatar } from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';
import { ChevronDownIcon } from '@chakra-ui/icons';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, signOut, user, walletAddress } = useAuth();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // If user is on the home page after login, redirect to game
      if (location.pathname === '/') {
        navigate('/game');
      }
    }
  }, [isLoading, isAuthenticated, location.pathname, navigate]);

  // Get the display name for the user menu
  const getDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    if (walletAddress) return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    return 'User';
  };

  return (
    <Box minH="100vh" bg={bgColor}>
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        padding="1rem"
        bg={bgColor}
        borderBottom="1px"
        borderColor={borderColor}
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Flex align="center" mr={5}>
          <RouterLink to="/">
            <Box fontSize="xl" fontWeight="bold">
              No There
            </Box>
          </RouterLink>
        </Flex>

        <Flex align="center" gap={4}>
          <RouterLink to="/">
            <Button
              variant={isActive('/') ? 'solid' : 'ghost'}
              colorScheme="blue"
            >
              Home
            </Button>
          </RouterLink>
          {isAuthenticated && (
            <>
              <RouterLink to="/game">
                <Button
                  variant={isActive('/game') ? 'solid' : 'ghost'}
                  colorScheme="blue"
                >
                  Play
                </Button>
              </RouterLink>
              <RouterLink to="/profile">
                <Button
                  variant={isActive('/profile') ? 'solid' : 'ghost'}
                  colorScheme="blue"
                >
                  Profile
                </Button>
              </RouterLink>
            </>
          )}
          {isAuthenticated ? (
            <Menu>
              <MenuButton as={Button} rightIcon={<ChevronDownIcon />}>
                <Flex align="center">
                  <Avatar size="xs" mr={2} name={getDisplayName()} />
                  {getDisplayName()}
                </Flex>
              </MenuButton>
              <MenuList>
                <MenuItem onClick={() => navigate('/profile')}>Profile</MenuItem>
                <MenuItem onClick={signOut}>Sign Out</MenuItem>
              </MenuList>
            </Menu>
          ) : (
            <Button onClick={() => navigate('/login')} colorScheme="blue">
              Sign In
            </Button>
          )}
        </Flex>
      </Flex>

      <Container maxW="container.xl" py={8}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout; 