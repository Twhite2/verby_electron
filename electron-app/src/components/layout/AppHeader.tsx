import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TranslateIcon from '@mui/icons-material/Translate';
import HomeIcon from '@mui/icons-material/Home';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';

const AppHeader = () => {
  const [helpOpen, setHelpOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === '/';
  
  const handleHelpOpen = () => {
    setHelpOpen(true);
  };
  
  const handleHelpClose = () => {
    setHelpOpen(false);
  };
  
  const goToHome = () => {
    navigate('/');
  };

  return (
    <Box sx={{ flexGrow: 0 }}>
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <TranslateIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            VerbyFlow
          </Typography>
          
          {!isHomePage && (
            <Button 
              color="primary" 
              startIcon={<HomeIcon />}
              onClick={goToHome}
              sx={{ mr: 1 }}
            >
              Home
            </Button>
          )}
          
          <IconButton
            size="large"
            color="primary"
            onClick={handleHelpOpen}
          >
            <HelpOutlineIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      
      {/* Help Dialog */}
      <Dialog
        open={helpOpen}
        onClose={handleHelpClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          How to use VerbyFlow
          <IconButton
            aria-label="close"
            onClick={handleHelpClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="h6" gutterBottom>
            Welcome to VerbyFlow - Real-time Bilingual Call Translation
          </Typography>
          <Typography paragraph>
            VerbyFlow enables real-time conversation translation between two people speaking different languages.
          </Typography>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            Getting Started:
          </Typography>
          <Typography component="ol" sx={{ pl: 2 }}>
            <li>Create a new session or join an existing one</li>
            <li>Select your preferred language</li>
            <li>Start speaking - your voice will be transcribed and translated in real-time</li>
            <li>Listen to the translated speech from your conversation partner</li>
            <li>Use the role toggle to switch between speaking and listening</li>
          </Typography>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', mt: 2 }}>
            Features:
          </Typography>
          <Typography component="ul" sx={{ pl: 2 }}>
            <li>Real-time speech recognition</li>
            <li>Instant translation</li>
            <li>Text-to-speech playback</li>
            <li>Conversation history tracking</li>
            <li>Session management for two-way communication</li>
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHelpClose} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AppHeader;
