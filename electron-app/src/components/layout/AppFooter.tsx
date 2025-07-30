import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Divider from '@mui/material/Divider';

const AppFooter = () => {
  // Try to get the app version from Electron
  const appVersion = window.electronAPI?.getAppVersion?.() || '1.0.0';

  return (
    <Box 
      component="footer"
      sx={{
        py: 2,
        px: 2,
        mt: 'auto',
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Divider sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">
          VerbyFlow v{appVersion} - Real-time Bilingual Call Translation
        </Typography>
        <Box>
          <Link href="#" color="primary" sx={{ mr: 2, fontSize: '0.875rem' }}>
            Privacy Policy
          </Link>
          <Link href="#" color="primary" sx={{ fontSize: '0.875rem' }}>
            Terms of Service
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default AppFooter;
