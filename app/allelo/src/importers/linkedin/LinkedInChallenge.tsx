import {useState} from "react";
import {Box, Button, Typography, Alert} from "@mui/material";
import {LINKEDIN_API_URL} from "@/config/importers.ts";

interface LinkedInChallengeProps {
  sessionId: string;
  onSuccess: (linkedInUsername: string) => void;
  onRestart: () => void;
}

export function LinkedInChallenge({sessionId, onSuccess, onRestart}: LinkedInChallengeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isIncorrectCode, setIsIncorrectCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsIncorrectCode(false);

    try {
      const response = await fetch(LINKEDIN_API_URL + '/api/li/verify-challenge', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sessionId}),
      });

      const data = await response.json();

      if (response.status === 422 && data.sessionId) {
        setError('Challenge in app is not accepted yet. Please try again.');
        setIsIncorrectCode(true);
        setLoading(false);
        return;
      }

      if (response.status === 200 && data.success) {
        onSuccess(data.linkedInUsername);
        return;
      }

      // For other errors, restart the login process
      setError(data.error || 'Challenge failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{py: 2}}>
      <Typography variant="body1" sx={{mb: 2}}>
        Please open the notification you received from your LinkedIn app on your phone. Then come back here and press the Check button. You have 10 minutes to do so.
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
        <Button
          type="submit"
          variant="contained"
          disabled={loading }
          fullWidth
        >
          {loading ? 'Verifying...' : 'Check'}
        </Button>
      </Box>
    </Box>
  );
}
