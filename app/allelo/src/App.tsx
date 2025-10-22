import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { BrowserNGLdoProvider, useNextGraphAuth } from '@/lib/nextgraph';
import type { NextGraphAuth } from '@/types/nextgraph';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SocialContractPage from '@/pages/SocialContractPage';
import { GroupJoinPage } from '@/components/groups/GroupJoinPage';
import { PersonalDataVaultPage } from '@/components/auth/PersonalDataVaultPage';
import { SocialContractAgreementPage } from '@/components/auth/SocialContractAgreementPage';
import { ClaimIdentityPage } from '@/components/auth/ClaimIdentityPage';
import { AcceptConnectionPage } from '@/components/auth/AcceptConnectionPage';
import { WelcomeToVaultPage } from '@/components/auth/WelcomeToVaultPage';
import { LoginPage } from '@/components/auth/LoginPage';
import ImportPage from '@/pages/ImportPage';
import ContactListPage from '@/pages/ContactListPage';
import ContactViewPage from '@/pages/ContactViewPage';
import { GroupPage } from '@/components/groups/GroupPage';
import GroupDetailPage from '@/components/groups/GroupDetailPage/GroupDetailPage';
import { GroupInfoPage } from '@/components/groups/GroupInfoPage';
import CreateGroupPage from '@/pages/CreateGroupPage';
import { InvitationPage } from '@/components/invitations/InvitationPage';
import HomePage from '@/pages/HomePage';
import PostsOffersPage from '@/pages/PostsOffersPage';
import MessagesPage from '@/pages/MessagesPage';
import { AccountPage } from '@/components/account/AccountPage';
import { NotificationsPage } from '@/components/notifications/NotificationsPage';
import { PhoneVerificationPage } from '@/components/account/PhoneVerificationPage';
import { createWireframeTheme } from '@/theme/wireframeTheme';
import { Box, Typography } from '@mui/material';
import { Button } from '@/components/ui';
import { isNextGraphEnabled } from '@/utils/featureFlags';
import CreateContactPage from "@/pages/CreateContactPage";

const theme = createWireframeTheme();

const NextGraphAppContent = () => {
  const nextGraphAuth = useNextGraphAuth() as unknown as NextGraphAuth | undefined;
  const { session, login, logout } = nextGraphAuth || {};

  console.log('NextGraph Auth:', nextGraphAuth);
  console.log('Session:', session);
  console.log('Keys:', nextGraphAuth ? Object.keys(nextGraphAuth) : 'no auth');

  const hasLogin = Boolean(login);
  const hasLogout = Boolean(logout);
  const isAuthenticated = Boolean(session?.ng);

  const isNextGraphReady = hasLogin && hasLogout;

  console.log('hasLogin:', hasLogin, 'hasLogout:', hasLogout);
  console.log('isAuthenticated:', isAuthenticated, 'isNextGraphReady:', isNextGraphReady);

  if (!isNextGraphReady) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh'
        }}
      >
        <Typography variant="h6">Loading NextGraph...</Typography>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: 2
        }}
      >
        <Typography variant="h4" component="h2" gutterBottom>
          Welcome to NAO
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Please log in with your NextGraph wallet to continue.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => login?.()}
        >
          Login with NextGraph
        </Button>
      </Box>
    );
  }

  return <AppRoutes />;
};

const MockAppContent = () => {
  return <AppRoutes />;
};

const AppRoutes = () => (
  <OnboardingProvider>
    <Router>
      <Routes>
        <Route path="/onboarding" element={<SocialContractPage />} />
        <Route path="/onboarding/social-contract" element={<SocialContractAgreementPage />} />
        <Route path="/onboarding/claim-identity" element={<ClaimIdentityPage />} />
        <Route path="/onboarding/accept-connection" element={<AcceptConnectionPage />} />
        <Route path="/join-group" element={<GroupJoinPage />} />

        <Route path="/*" element={
          <DashboardLayout>
            <Routes>
              <Route path="/onboarding/welcome" element={<WelcomeToVaultPage />} />
              <Route path="/" element={<HomePage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/contacts" element={<ContactListPage />} />
              <Route path="/contacts/create" element={<CreateContactPage />} />
              <Route path="/contacts/:id" element={<ContactViewPage />} />
              <Route path="/groups" element={<GroupPage />} />
              <Route path="/groups/create" element={<CreateGroupPage />} />
              <Route path="/groups/:groupId" element={<GroupDetailPage />} />
              <Route path="/groups/:groupId/info" element={<GroupInfoPage />} />
              <Route path="/posts" element={<PostsOffersPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/verify-phone/:phone" element={<PhoneVerificationPage />} />
              <Route path="/invite" element={<InvitationPage />} />
              </Routes>
            </DashboardLayout>
        } />
        <Route path="/signup" element={<PersonalDataVaultPage />} />
        <Route path="/register" element={<PersonalDataVaultPage />} />
        <Route path="/login" element={<LoginPage />} />

      </Routes>
    </Router>
  </OnboardingProvider>
);

const AppContent = () => {
  const useNextGraph = isNextGraphEnabled();

  if (useNextGraph) {
    return <NextGraphAppContent />;
  }

  return <MockAppContent />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {isNextGraphEnabled() ? (
        <BrowserNGLdoProvider>
          <AppContent />
        </BrowserNGLdoProvider>
      ) : (
        <AppContent />
      )}
    </ThemeProvider>
  );
}

export default App;
