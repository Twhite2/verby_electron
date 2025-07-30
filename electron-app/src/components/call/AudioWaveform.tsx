import { useRef, useEffect } from 'react';
import Box from '@mui/material/Box';

interface AudioWaveformProps {
  level: number; // 0 to 1
}

const AudioWaveform = ({ level }: AudioWaveformProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Number of bars in the waveform
  const barCount = 32;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate bar width with spacing
    const spacing = 2;
    const barWidth = (canvas.width / barCount) - spacing;
    
    // Draw waveform bars
    for (let i = 0; i < barCount; i++) {
      // Create a randomized height based on the audio level
      // Center bars are taller than edges for a natural waveform look
      const centerOffset = Math.abs(i - barCount / 2) / (barCount / 2);
      const barHeightMultiplier = 1 - centerOffset * 0.5;
      
      // Add some randomness for a natural look
      const randomness = Math.random() * 0.3 - 0.15;
      
      // Calculate bar height based on level and position
      const barHeight = (level * barHeightMultiplier + randomness) * canvas.height;
      
      // Set color based on level
      const hue = 230; // Blue/purple tone
      const lightness = 50 + level * 20; // Brighter when louder
      
      ctx.fillStyle = `hsl(${hue}, 80%, ${lightness}%)`;
      
      // Draw bar (centered vertically)
      const x = i * (barWidth + spacing);
      const y = (canvas.height - barHeight) / 2;
      
      ctx.fillRect(x, y, barWidth, barHeight);
    }
  }, [level]);
  
  return (
    <Box sx={{ width: '100%', height: 80, bgcolor: 'background.paper', borderRadius: 1, p: 1 }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={60}
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
};

export default AudioWaveform;
