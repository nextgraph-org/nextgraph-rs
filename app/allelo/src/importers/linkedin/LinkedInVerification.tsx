import {useState} from "react";
import {Box, Button, TextField, Typography, Alert} from "@mui/material";
import {LINKEDIN_API_URL} from "@/config/importers.ts";

interface LinkedInVerificationProps {
  sessionId: string;
  onSuccess: (linkedInUsername: string) => void;
  onRestart: () => void;
}

export function LinkedInVerification({sessionId, onSuccess, onRestart}: LinkedInVerificationProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIncorrectCode, setIsIncorrectCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsIncorrectCode(false);

    try {
      const response = await fetch(LINKEDIN_API_URL + '/api/li/verify-code', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId, code}),
      });

      const data = await response.json();

      if (response.status === 422 && data.status === 'incorrect_code') {
        setError('Verification code is incorrect. Please try again.');
        setIsIncorrectCode(true);
        setCode('');
        setLoading(false);
        return;
      }

      if (response.status === 200 && data.success) {
        onSuccess(data.linkedInUsername);
        return;
      }

      // For other errors, restart the login process
      setError(data.error || 'Verification failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{py: 2}}>
      <Typography variant="body1" sx={{mb: 2}}>
        Please check your email for a verification code from LinkedIn.
      </Typography>

      {error && (
        <Alert severity={isIncorrectCode ? 'warning' : 'error'} sx={{mb: 2}}>
          {error}
          {!isIncorrectCode && (
            <Button size="small" onClick={onRestart} sx={{mt: 1}}>
              Start Over
            </Button>
          )}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
        <TextField
          label="Verification Code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          disabled={loading}
          fullWidth
          autoFocus
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !code}
          fullWidth
        >
          {loading ? 'Verifying...' : 'Submit'}
        </Button>
      </Box>
    </Box>
  );
}
