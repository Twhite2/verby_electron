import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import IconButton from '@mui/material/IconButton';

interface LanguageSelectorProps {
  sourceLanguage: string;
  targetLanguage: string;
  onLanguageChange: (source: string, target: string) => void;
}

// Language options
const languageOptions = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'es-ES', name: 'Spanish (Spain)' },
  { code: 'fr-FR', name: 'French (France)' },
  { code: 'de-DE', name: 'German (Germany)' },
  { code: 'it-IT', name: 'Italian (Italy)' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)' },
  { code: 'ja-JP', name: 'Japanese (Japan)' },
  { code: 'ko-KR', name: 'Korean (South Korea)' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ru-RU', name: 'Russian (Russia)' },
  { code: 'ar-SA', name: 'Arabic (Saudi Arabia)' },
  { code: 'hi-IN', name: 'Hindi (India)' },
];

const LanguageSelector = ({ 
  sourceLanguage, 
  targetLanguage, 
  onLanguageChange 
}: LanguageSelectorProps) => {
  const [source, setSource] = useState(sourceLanguage);
  const [target, setTarget] = useState(targetLanguage);

  // Update local state when props change
  useEffect(() => {
    setSource(sourceLanguage);
    setTarget(targetLanguage);
  }, [sourceLanguage, targetLanguage]);

  const handleSourceChange = (event: SelectChangeEvent<string>) => {
    const newSource = event.target.value;
    setSource(newSource);
    onLanguageChange(newSource, target);
  };

  const handleTargetChange = (event: SelectChangeEvent<string>) => {
    const newTarget = event.target.value;
    setTarget(newTarget);
    onLanguageChange(source, newTarget);
  };

  const handleSwapLanguages = () => {
    setSource(target);
    setTarget(source);
    onLanguageChange(target, source);
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          I speak:
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="source-language-label">Source Language</InputLabel>
          <Select
            labelId="source-language-label"
            id="source-language"
            value={source}
            label="Source Language"
            onChange={handleSourceChange}
          >
            {languageOptions.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Swap languages button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
        <IconButton
          onClick={handleSwapLanguages}
          color="primary"
          size="small"
          sx={{ 
            border: 1, 
            borderColor: 'divider',
            borderStyle: 'dashed'
          }}
        >
          <SyncAltIcon />
        </IconButton>
      </Box>

      <Box>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          Translate to:
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel id="target-language-label">Target Language</InputLabel>
          <Select
            labelId="target-language-label"
            id="target-language"
            value={target}
            label="Target Language"
            onChange={handleTargetChange}
          >
            {languageOptions.map((lang) => (
              <MenuItem key={lang.code} value={lang.code}>
                {lang.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default LanguageSelector;
