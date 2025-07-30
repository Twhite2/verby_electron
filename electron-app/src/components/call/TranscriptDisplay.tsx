import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PersonIcon from '@mui/icons-material/Person';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { format } from 'date-fns';

// Temporary interfaces until we create proper types
interface Transcript {
  id: string;
  text: string;
  translation: string;
  timestamp: number;
  isSelf: boolean;
}

interface TranscriptDisplayProps {
  transcripts: Transcript[];
}

const TranscriptDisplay = ({ transcripts }: TranscriptDisplayProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  const handlePlayTTS = (text: string) => {
    // This would be connected to the TTS service
    console.log('Playing TTS:', text);
    // In a real implementation, we would call the backend TTS service
  };

  // Sort transcripts by timestamp
  const sortedTranscripts = [...transcripts].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <Box sx={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Transcript messages container - scrollable */}
      <Box sx={{ 
        flexGrow: 1, 
        overflowY: 'auto',
        py: 1,
      }}>
        {sortedTranscripts.length === 0 ? (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            opacity: 0.7
          }}>
            <Typography variant="body1" color="text.secondary">
              No conversation yet. Start speaking to see transcripts.
            </Typography>
          </Box>
        ) : (
          sortedTranscripts.map((transcript) => (
            <Box
              key={transcript.id}
              sx={{
                display: 'flex',
                mb: 2,
                flexDirection: transcript.isSelf ? 'row' : 'row-reverse',
                px: 1,
              }}
            >
              {/* Avatar indicator */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  mt: 1,
                  mx: 1,
                }}
              >
                {transcript.isSelf ? (
                  <PersonIcon color="primary" sx={{ fontSize: 28 }} />
                ) : (
                  <PersonOutlineIcon color="secondary" sx={{ fontSize: 28 }} />
                )}
              </Box>
              
              {/* Message content */}
              <Paper 
                elevation={1}
                sx={{ 
                  p: 1.5, 
                  maxWidth: '80%',
                  backgroundColor: transcript.isSelf 
                    ? 'primary.dark' 
                    : 'secondary.dark',
                  borderRadius: 2,
                }}
              >
                {/* Original text */}
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {transcript.text}
                </Typography>
                
                {/* Translation */}
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mt: 1, 
                    color: 'rgba(255,255,255,0.7)',
                    fontStyle: 'italic'
                  }}
                >
                  {transcript.translation}
                </Typography>
                
                {/* Footer: timestamp and actions */}
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 1,
                }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {format(new Date(transcript.timestamp), 'HH:mm:ss')}
                  </Typography>
                  
                  <Tooltip title="Play translation">
                    <IconButton 
                      size="small" 
                      sx={{ color: 'rgba(255,255,255,0.7)' }}
                      onClick={() => handlePlayTTS(transcript.translation)}
                    >
                      <VolumeUpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>
    </Box>
  );
};

export default TranscriptDisplay;
