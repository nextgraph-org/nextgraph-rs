import {
  Box,
  Typography,
  Paper,
  FormControlLabel,
  Checkbox,
  Link,
  Alert,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import type { AccountVerificationProps } from './types';

export const AccountVerification = ({
  agreedToContract,
  contractError,
  onAgreementChange,
  onContractDetailsClick,
}: AccountVerificationProps) => {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 3,
        mb: 3,
        backgroundColor: 'background.default',
        border: contractError ? '2px solid' : '1px solid',
        borderColor: contractError ? 'error.main' : 'divider'
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        <CheckCircle color="primary" />
        NAO Social Contract
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
        By creating an account, you agree to participate in the NAO network with respect, 
        authenticity, and positive intent. This includes:
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • <strong>Respectful Communication:</strong> Engage thoughtfully and kindly
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • <strong>Authentic Identity:</strong> Be genuine in your interactions
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • <strong>Constructive Participation:</strong> Contribute positively to communities
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          • <strong>Privacy Respect:</strong> Honor others' boundaries and consent
        </Typography>
      </Box>

      <FormControlLabel
        control={
          <Checkbox
            checked={agreedToContract}
            onChange={(e) => onAgreementChange(e.target.checked)}
            color="primary"
          />
        }
        label={
          <Typography variant="body2">
            I agree to the{' '}
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onContractDetailsClick();
              }}
              sx={{ textDecoration: 'none' }}
            >
              NAO Social Contract
            </Link>
            {' '}and commit to being a positive member of the network
          </Typography>
        }
        sx={{ alignItems: 'flex-start', mt: 1 }}
      />
      
      {contractError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {contractError}
        </Alert>
      )}
    </Paper>
  );
};