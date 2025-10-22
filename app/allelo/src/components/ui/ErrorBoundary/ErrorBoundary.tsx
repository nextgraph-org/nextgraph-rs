import * as React from 'react';
import { Box, Typography, Alert, AlertTitle } from '@mui/material';
import { Button } from '../Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}


export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default fallback inline
      return (
        <Box
          sx={{
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            textAlign: 'center',
            gap: 2
          }}
        >
          <Alert severity="error" sx={{ width: '100%', maxWidth: 500 }}>
            <AlertTitle>Something went wrong</AlertTitle>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {this.state.error.message || 'An unexpected error occurred'}
            </Typography>
            <Button variant="outlined" onClick={this.resetError} size="small">
              Try again
            </Button>
          </Alert>
        </Box>
      );
    }

    return this.props.children;
  }
}