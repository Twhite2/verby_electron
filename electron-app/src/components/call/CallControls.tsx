import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import MicIcon from '@mui/icons-material/Mic';
import HearingIcon from '@mui/icons-material/Hearing';
import CallEndIcon from '@mui/icons-material/CallEnd';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import SettingsIcon from '@mui/icons-material/Settings';
import { useState } from 'react';

interface CallControlsProps {
  isSpeaking: boolean;
  onToggleSpeaking: () => void;
  onEndCall: () => void;
}

const CallControls = ({
  isSpeaking,
  onToggleSpeaking,
  onEndCall
}: CallControlsProps) => {
  const [isMuted, setIsMuted] = useState(false);
  
  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    // In a real implementation, we would mute the audio
  };

  return (
    <Box>
      {/* Primary Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-around',
        alignItems: 'center',
        mb: 2
      }}>
        <Tooltip title={isSpeaking ? "Switch to listener mode" : "Switch to speaker mode"}>
          <Button
            variant="contained"
            color={isSpeaking ? "primary" : "secondary"}
            startIcon={isSpeaking ? <MicIcon /> : <HearingIcon />}
            onClick={onToggleSpeaking}
            size="large"
            sx={{ 
              borderRadius: 28,
              px: 3,
              py: 1
            }}
          >
            {isSpeaking ? "Speaking" : "Listening"}
          </Button>
        </Tooltip>

        <Tooltip title="End call">
          <IconButton
            color="error"
            onClick={onEndCall}
            sx={{ 
              bgcolor: 'error.main',
              color: 'white',
              p: 1.5,
              '&:hover': {
                bgcolor: 'error.dark',
              }
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Secondary Controls */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2
      }}>
        <Tooltip title={isMuted ? "Unmute" : "Mute"}>
          <IconButton 
            size="small" 
            onClick={handleMuteToggle}
            color={isMuted ? "default" : "primary"}
          >
            {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton size="small">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default CallControls;
