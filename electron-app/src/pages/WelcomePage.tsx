import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Divider from '@mui/material/Divider';
import TranslateIcon from '@mui/icons-material/Translate';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import { useSnackbar } from '../components/common/SnackbarProvider';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  
  const [newSessionName, setNewSessionName] = useState('');
  const [sessionIdToJoin, setSessionIdToJoin] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const handleCreateSession = async () => {
    if (!newSessionName.trim()) {
      showSnackbar('Please enter a session name', 'warning');
      return;
    }

    setIsCreating(true);

    try {
      // Check if we're running in Electron
      if (window.electronAPI) {
        const result = await window.electronAPI.createSession(newSessionName);
        
        if (result.success) {
          showSnackbar(`Session "${result.name}" created successfully!`, 'success');
          navigate(`/call/${result.sessionId}`);
        } else {
          showSnackbar('Failed to create session', 'error');
        }
      } else {
        // Fallback for web browser testing
        const mockSessionId = `session-${Date.now()}`;
        showSnackbar(`Session created in browser mode (no backend)`, 'info');
        navigate(`/call/${mockSessionId}`);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      showSnackbar('Failed to create session', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinSession = async () => {
    if (!sessionIdToJoin.trim()) {
      showSnackbar('Please enter a session ID', 'warning');
      return;
    }

    setIsJoining(true);

    try {
      // Check if we're running in Electron
      if (window.electronAPI) {
        const result = await window.electronAPI.joinSession(sessionIdToJoin);
        
        if (result.success) {
          showSnackbar('Joined session successfully!', 'success');
          navigate(`/call/${result.sessionId}`);
        } else {
          showSnackbar('Failed to join session', 'error');
        }
      } else {
        // Fallback for web browser testing
        showSnackbar('Joined session in browser mode (no backend)', 'info');
        navigate(`/call/${sessionIdToJoin}`);
      }
    } catch (error) {
      console.error('Failed to join session:', error);
      showSnackbar('Failed to join session - check if the session ID is correct', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: 'calc(100vh - 130px)', // Adjust for header and footer
      p: 3,
    }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', mb: 2 }}>
          Welcome to VerbyFlow
        </Typography>
        <Typography variant="h5" sx={{ color: 'text.secondary' }}>
          Real-time bilingual call translation
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
          <TranslateIcon sx={{ fontSize: '2rem', mr: 1, color: 'primary.main' }} />
        </Box>
      </Box>

      <Grid container spacing={4} sx={{ maxWidth: 1000, mx: 'auto' }}>
        {/* Create New Session Card */}
        <Grid item xs={12} md={6}>
          <Card 
            elevation={4} 
            sx={{ 
              height: '100%',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 8,
              }
            }}
          >
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Create a New Session
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Start a new bilingual conversation and share the session ID with your call partner
              </Typography>
              <TextField
                fullWidth
                label="Session Name"
                variant="outlined"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                sx={{ mb: 2 }}
              />
            </CardContent>
            <CardActions>
              <Button 
                fullWidth 
                variant="contained" 
                color="primary" 
                size="large"
                startIcon={<AddIcon />}
                onClick={handleCreateSession}
                disabled={isCreating || !newSessionName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create Session'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Join Existing Session Card */}
        <Grid item xs={12} md={6}>
          <Card 
            elevation={4} 
            sx={{ 
              height: '100%',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: 8,
              }
            }}
          >
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Join Existing Session
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Enter a session ID provided by your call partner to join their conversation
              </Typography>
              <TextField
                fullWidth
                label="Session ID"
                variant="outlined"
                value={sessionIdToJoin}
                onChange={(e) => setSessionIdToJoin(e.target.value)}
                sx={{ mb: 2 }}
              />
            </CardContent>
            <CardActions>
              <Button 
                fullWidth 
                variant="contained" 
                color="secondary" 
                size="large"
                startIcon={<LoginIcon />}
                onClick={handleJoinSession}
                disabled={isJoining || !sessionIdToJoin.trim()}
              >
                {isJoining ? 'Joining...' : 'Join Session'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WelcomePage;
