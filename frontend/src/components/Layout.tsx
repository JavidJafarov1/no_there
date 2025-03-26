import { Box, Flex, Button, useColorModeValue, Container } from '@chakra-ui/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, logout, authenticated, ready } = usePrivy();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (ready && authenticated) {
      // If user is on the home page after login, redirect to game
      if (location.pathname === '/') {
        navigate('/game');
      }
    }
  }, [ready, authenticated, location.pathname, navigate]);

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
          {authenticated && (
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
          {authenticated ? (
            <Button onClick={logout} colorScheme="red" variant="outline">
              Disconnect
            </Button>
          ) : (
            <Button onClick={login} colorScheme="blue">
              Connect Wallet
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