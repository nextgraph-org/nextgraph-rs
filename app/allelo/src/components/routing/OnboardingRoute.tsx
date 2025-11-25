import { Navigate, Outlet } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { getOnboardingRedirectPath } from '@/utils/onboarding';
import { Box, CircularProgress } from '@mui/material';

interface OnboardingRouteProps {
  children?: React.ReactNode;
  hasSession: boolean;
  loginPath?: string;
}

/**
 * Route wrapper that ensures users complete onboarding before accessing protected routes
 *
 * Flow:
 * 1. If not authenticated -> redirect to login
 * 2. Wait for onboarding state to initialize from storage
 * 3. If authenticated but onboarding incomplete -> redirect to current onboarding step
 * 4. If authenticated and onboarding complete -> allow access to route
 */
export const OnboardingRoute = ({
  children,
  hasSession,
  loginPath = '/wallet/login',
}: OnboardingRouteProps) => {
  const { state, isInitialized } = useOnboarding();
  const { isComplete, currentStep } = state;

  // Not authenticated - redirect to login
  if (!hasSession) {
    return <Navigate to={loginPath} replace />;
  }

  if (!isInitialized) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Authenticated but onboarding incomplete - redirect to current step
  const redirectPath = getOnboardingRedirectPath(isComplete ?? false, currentStep!);
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  // Authenticated and onboarding complete - allow access
  return children ? <>{children}</> : <Outlet />;
};