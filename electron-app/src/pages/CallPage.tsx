import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MicIcon from '@mui/icons-material/Mic';
import HearingIcon from '@mui/icons-material/Hearing';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import { useSnackbar } from '../components/common/SnackbarProvider';

// Import call-related components
import AudioWaveform from '../components/call/AudioWaveform';
import TranscriptDisplay from '../components/call/TranscriptDisplay';
import LanguageSelector from '../components/call/LanguageSelector';
import CallControls from '../components/call/CallControls';

// Temporary interfaces until we create our types
interface Transcript {
  id: string;
  text: string;
  translation: string;
  timestamp: number;
  isSelf: boolean;
}

const CallPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en-US');
  const [targetLanguage, setTargetLanguage] = useState('es-ES');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Mock connection effect - this would be replaced with actual WebSocket connection
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
      showSnackbar('Connected to session successfully', 'success');
    }, 1500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Mock transcript data
  useEffect(() => {
    if (isConnected) {
      // Add some sample transcripts for demo purposes
      setTranscripts([
        {
          id: '1',
          text: 'Hello, how are you today?',
          translation: '¿Hola, cómo estás hoy?',
          timestamp: Date.now() - 60000,
          isSelf: true
        },
        {
          id: '2',
          text: 'I am doing well, thank you for asking.',
          translation: 'Estoy bien, gracias por preguntar.',
          timestamp: Date.now() - 30000,
          isSelf: false
        }
      ]);
    }
  }, [isConnected]);
  
  const handleCopySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      showSnackbar('Session ID copied to clipboard', 'success');
    }
  };
  
  const handleLanguageChange = (source: string, target: string) => {
    setSourceLanguage(source);
    setTargetLanguage(target);
    showSnackbar('Language preferences updated', 'info');
  };
  
  const handleToggleSpeaking = () => {
    setIsSpeaking(!isSpeaking);
  };
  
  const handleEndCall = () => {
    // Implement cleanup here
    navigate('/');
  };
  
  // Mock audio level animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isSpeaking) {
      interval = setInterval(() => {
        setAudioLevel(Math.random() * 0.7 + 0.1); // Random between 0.1 and 0.8
      }, 100);
    } else {
      setAudioLevel(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isSpeaking]);

  if (isConnecting) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 130px)'
      }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6">
          Connecting to session...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 2 }}>
      {/* Session Header */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <LinkIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            Session: {sessionId}
          </Typography>
          <Button
            startIcon={<ContentCopyIcon />}
            size="small"
            sx={{ ml: 2 }}
            onClick={handleCopySessionId}
          >
            Copy ID
          </Button>
        </Box>
        
        <Chip
          label={isConnected ? "Connected" : "Disconnected"}
          color={isConnected ? "success" : "error"}
          size="small"
        />
      </Paper>
      
      <Grid container spacing={3}>
        {/* Left Column - Language & Controls */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Language Settings
            </Typography>
            <LanguageSelector 
              sourceLanguage={sourceLanguage}
              targetLanguage={targetLanguage}
              onLanguageChange={handleLanguageChange}
            />
          </Paper>
          
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Call Controls
            </Typography>
            <CallControls 
              isSpeaking={isSpeaking}
              onToggleSpeaking={handleToggleSpeaking}
              onEndCall={handleEndCall}
            />
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Audio Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {isSpeaking ? (
                <>
                  <MicIcon color="primary" sx={{ mr: 1 }} />
                  <Typography>Recording...</Typography>
                </>
              ) : (
                <>
                  <HearingIcon color="secondary" sx={{ mr: 1 }} />
                  <Typography>Listening...</Typography>
                </>
              )}
            </Box>
            <AudioWaveform level={audioLevel} />
          </Paper>
        </Grid>
        
        {/* Right Column - Transcripts */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '70vh', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" gutterBottom>
              Conversation
            </Typography>
            
            <TranscriptDisplay transcripts={transcripts} />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CallPage;
