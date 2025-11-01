import {useState, useCallback, useEffect, useRef} from "react";
import {Box, Button, Typography, Alert, CircularProgress} from "@mui/material";
import {LINKEDIN_API_URL} from "@/config/importers";
import {LinkedInData, DEBUG} from "./linkedInTypes";

interface LinkedInArchiveStatusProps {
  linkedInUsername: string;
  onSuccess: (data: LinkedInData) => void;
  onFallbackToDragDrop: () => void;
  onRelogin: () => void;
}

export function LinkedInArchiveStatus({
  linkedInUsername,
  onSuccess,
  onFallbackToDragDrop,
  onRelogin
}: LinkedInArchiveStatusProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isRequestInProgress = useRef(false);

  const getLinkedInData = useCallback(async () => {
    // Prevent concurrent requests
    if (isRequestInProgress.current) {
      return;
    }

    isRequestInProgress.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(LINKEDIN_API_URL + '/api/li/get-linkedin-data', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({linkedInUsername, debug: DEBUG}),
      });

      const data = await response.json();

      if (response.status === 400 && data.status === 'no-cookies-found') {
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      if (response.status === 417 && data.status === 'request-pending') {
        setMessage('Data archive is not ready yet. This can take up to 24 hours.');
        setLoading(false);
        return;
      }

      if (response.status === 200 && data.success) {
        onSuccess(data);
        return;
      }

      setError(data.error || 'Failed to get LinkedIn data');
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setLoading(false);
    } finally {
      isRequestInProgress.current = false;
    }
  }, [linkedInUsername, onSuccess]);

  const requestArchive = useCallback(async () => {
    // Prevent concurrent requests
    if (isRequestInProgress.current) {
      return;
    }

    isRequestInProgress.current = true;
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(LINKEDIN_API_URL + '/api/li/request-zip-archive', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({linkedInUsername, debug: DEBUG}),
      });

      const data = await response.json();

      isRequestInProgress.current = false;

      if (response.status === 422) {
        if (data.status === 'archive-available') {
          // Archive is ready, try to get it
          await getLinkedInData();
          return;
        }

        if (data.status === 'request-pending') {
          setMessage('LinkedIn is preparing your archive. This can take up to 24 hours.');
          setLoading(false);
          return;
        }

        // Button/option errors - show error with manual upload option
        setError(data.error || 'Failed to request archive');
        setLoading(false);
        return;
      }

      if (response.status === 200 && data.success) {
        setMessage('LinkedIn is preparing your archive. This can take up to 24 hours.');
        setLoading(false);
        return;
      }

      setError(data.error || 'Failed to request archive');
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setLoading(false);
    } finally {
      isRequestInProgress.current = false;
    }
  }, [linkedInUsername, getLinkedInData]);

  // Auto-start archive request on mount
  useEffect(() => {
    requestArchive();
  }, [requestArchive]);

  const handleRetryAutomatic = () => {
    requestArchive();
  };

  const handleManualUpload = () => {
    onFallbackToDragDrop();
  };

  const isSessionExpired = error?.includes('Session expired') || error?.includes('no cookies found');

  return (
    <Box sx={{py: 2}}>
      {loading && (
        <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2}}>
          <CircularProgress size={48}/>
          <Typography variant="body1">
            Requesting your LinkedIn data...
          </Typography>
        </Box>
      )}

      {message && !loading && (
        <Alert severity="info" sx={{mb: 2}}>
          {message}
        </Alert>
      )}

      {error && !loading && (
        <>
          <Alert severity="error" sx={{mb: 2}}>
            {error}
          </Alert>
          <Box sx={{display: 'flex', gap: 1, mt: 1}}>
            {isSessionExpired ? (
              <Button size="small" onClick={onRelogin} variant="contained">
                Login Again
              </Button>
            ) : (
              <>
                <Button size="small" onClick={handleRetryAutomatic} variant="contained">
                  Retry Automatic
                </Button>
                <Button size="small" onClick={handleManualUpload} variant="outlined">
                  Try Manual Upload
                </Button>
              </>
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
