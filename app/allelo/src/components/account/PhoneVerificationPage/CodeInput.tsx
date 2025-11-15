import React from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Sms,
  CheckCircle,
  ArrowBack,
} from "@mui/icons-material";
import {formatPhone} from "@/utils/phoneHelper";
import {useNavigate} from "react-router-dom";

interface CodeInputProps {
  phoneNumber: string;
  verificationCode: string;
  setVerificationCode: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
}

const CodeInput: React.FC<CodeInputProps> = ({
                                               phoneNumber,
                                               verificationCode,
                                               setVerificationCode,
                                               isLoading,
                                               error,
                                               onSubmit,
                                               onBack,
                                             }) => {
  const navigate = useNavigate();

  return (
    <Card sx={{maxWidth: 500, mx: 'auto', mt: 4}}>
      <CardContent sx={{p: 4}}>
        <Box sx={{textAlign: 'center', mb: 3}}>
          <Sms sx={{fontSize: 48, color: 'primary.main', mb: 2}}/>
          <Typography variant="h5" component="h1" gutterBottom sx={{fontWeight: 600}}>
            Enter Verification Code
          </Typography>
          <Typography variant="body1" color="text.secondary">
            We sent a verification code to{' '}
            <Typography component="span" sx={{fontWeight: 600}}>
              {formatPhone(phoneNumber)}
            </Typography>
          </Typography>
        </Box>

        <Box component="form" onSubmit={onSubmit} sx={{mt: 3}}>
          <TextField
            fullWidth
            label="Verification Code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="123456"
            disabled={isLoading}
            slotProps={{
              htmlInput: {
                style: {textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.5rem'},
              }
            }}
            sx={{mb: 3}}
          />

          {error && (
            <Alert severity="error" sx={{mb: 3}}>
              {error}
            </Alert>
          )}

          <Box sx={{display: 'flex', gap: 2}}>
            <Button
              variant="outlined"
              onClick={onBack}
              startIcon={<ArrowBack/>}
              disabled={isLoading}
              sx={{py: 1.5}}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isLoading || !verificationCode.trim()}
              startIcon={isLoading ? <CircularProgress size={20}/> : <CheckCircle/>}
              sx={{py: 1.5}}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </Box>

          <Box sx={{mt: 2, textAlign: 'center'}}>
            <Button
              variant="text"
              onClick={() => navigate('/account')}
              disabled={isLoading}
              size="small"
            >
              Skip for now
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CodeInput;