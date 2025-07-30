import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from './components/common/SnackbarProvider';

// Pages
import WelcomePage from './pages/WelcomePage';
import CallPage from './pages/CallPage';

// Components
import AppHeader from './components/layout/AppHeader';
import AppFooter from './components/layout/AppFooter';

// Types
import { ElectronAPI } from './types';


function App() {
  const [isElectronConnected, setIsElectronConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if the app is running in Electron
  useEffect(() => {
    const checkElectron = async () => {
      try {
        // Try to ping the Electron main process
        if (window.electronAPI) {
          const response = await window.electronAPI.ping();
          setIsElectronConnected(response === 'pong');
        } else {
          setIsElectronConnected(false);
        }
      } catch (error) {
        console.error('Failed to connect to Electron:', error);
        setIsElectronConnected(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkElectron();
  }, []);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <SnackbarProvider>
      <BrowserRouter>
        <CssBaseline />
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppHeader />
          
          <Box component="main" sx={{ flexGrow: 1, p: 2 }}>
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/call/:sessionId" element={<CallPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Box>
          
          <AppFooter />
        </Box>
      </BrowserRouter>
    </SnackbarProvider>
  );
}

export default App;
