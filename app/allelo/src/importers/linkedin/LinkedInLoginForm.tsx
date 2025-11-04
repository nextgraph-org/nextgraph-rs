import {useState} from "react";
import {Box, Button, TextField, Typography, Alert} from "@mui/material";
import {LINKEDIN_API_URL} from "@/config/importers";
import {DEBUG} from "./linkedInTypes";
import {useFieldValidation} from "@/hooks/useFieldValidation";

interface LinkedInLoginFormProps {
  onSuccess: (linkedInUsername?: string) => void;
  onVerificationRequired: (sessionId: string) => void;
  onCaptchaRequired: () => void;
  preservedUsername?: string;
}

export function LinkedInLoginForm({
  onSuccess,
  onVerificationRequired,
  onCaptchaRequired,
  preservedUsername
}: LinkedInLoginFormProps) {
  const [username, setUsername] = useState(preservedUsername || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldValidation = useFieldValidation(password, 'linkedin', {validateOn: "change", required: true});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(LINKEDIN_API_URL + '/api/li/user-login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password, debug: DEBUG}),
      });

      const data = await response.json();

      if (response.status === 422 && data.error === 'captcha') {
        onCaptchaRequired();
        return;
      }

      if (response.status === 200) {
        if (data.status === 'verification_required') {
          onVerificationRequired(data.sessionId);
          return;
        }
      }

      if (response.status === 200) {
        onSuccess(data.linkedInUsername);
        return;
      }

      setError(data.error || 'Login failed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{py: 2}}>
      <Typography variant="body1" sx={{mb: 2}}>
        Sign in to your LinkedIn account to automatically import your data.
      </Typography>

      {error && (
        <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} sx={{display: 'flex', flexDirection: 'column', gap: 2}}>
        <TextField
          label="Email or Phone"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          fullWidth
        />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => {
            fieldValidation.setFieldValue(e.target.value);
            fieldValidation.triggerField();
            setPassword(e.target.value)
          }}
          required
          disabled={loading}
          fullWidth
          error={fieldValidation.error || Boolean(error)}
          helperText={fieldValidation.error ? "The password you provided must have at least 6 characters" : ""}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !username || !password || fieldValidation.error}
          fullWidth
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </Box>
    </Box>
  );
}