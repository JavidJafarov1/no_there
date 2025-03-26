import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PrivyProvider } from '@privy-io/react-auth';
import Layout from './components/Layout';
import Home from './pages/Home';
import Game from './pages/Game';
import Profile from './pages/Profile';

function App() {
  return (
    <ChakraProvider>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID}
        config={{
          loginMethods: ['email', 'wallet'],
          appearance: {
            theme: 'dark',
            accentColor: '#676FFF',
            showWalletLoginFirst: true,
          },
        }}
      >
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/game" element={<Game />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Layout>
        </Router>
      </PrivyProvider>
    </ChakraProvider>
  );
}

export default App; 