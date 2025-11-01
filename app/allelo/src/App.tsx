import { HashRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { BrowserNGLdoProvider, useNextGraphAuth } from "@/lib/nextgraph";
import type { NextGraphAuth } from "@/types/nextgraph";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SocialContractPage from "@/pages/SocialContractPage";
import { GroupJoinPage } from "@/components/groups/GroupJoinPage";
import { PersonalDataVaultPage } from "@/components/auth/PersonalDataVaultPage";
import { SocialContractAgreementPage } from "@/components/auth/SocialContractAgreementPage";
import { ClaimIdentityPage } from "@/components/auth/ClaimIdentityPage";
import { AcceptConnectionPage } from "@/components/auth/AcceptConnectionPage";
import { WelcomeToVaultPage } from "@/components/auth/WelcomeToVaultPage";
import { LoginPage } from "@/components/auth/LoginPage";
import ImportPage from "@/pages/ImportPage";
import ContactListPage from "@/pages/ContactListPage";
import ContactViewPage from "@/pages/ContactViewPage";
import { GroupPage } from "@/components/groups/GroupPage";
import GroupDetailPage from "@/components/groups/GroupDetailPage/GroupDetailPage";
import { GroupInfoPage } from "@/components/groups/GroupInfoPage";
import CreateGroupPage from "@/pages/CreateGroupPage";
import { InvitationPage } from "@/components/invitations/InvitationPage";
import HomePage from "@/pages/HomePage";
import PostsOffersPage from "@/pages/PostsOffersPage";
import MessagesPage from "@/pages/MessagesPage";
import { AccountPage } from "@/components/account/AccountPage";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";
import { PhoneVerificationPage } from "@/components/account/PhoneVerificationPage";
import { createWireframeTheme } from "@/theme/wireframeTheme";
import { Box, Typography } from "@mui/material";
import { Button } from "@/components/ui";
import { isNextGraphEnabled } from "@/utils/featureFlags";
import CreateContactPage from "@/pages/CreateContactPage";

import { useSvelteComponent } from "svelte-in-react";
import WalletCreate from "./svelte/WalletCreate.svelte";
import WalletLogin from "./svelte/WalletLogin.svelte";

const theme = createWireframeTheme();

const ProtectedRoute =
  ({ children, hasSession, redirectPath = "/wallet/login" }: {
    children?: React.ReactNode,
    hasSession: boolean,
    redirectPath?: string
  }) => {
    if (!hasSession) {
      return <Navigate to={redirectPath} replace />;
    }
    return children ? children : <Outlet />;
  };

const AppRoutes = () => {
  // Convert the Svelte components to React components
  const ReactWalletCreate = useSvelteComponent(WalletCreate);
  const ReactWalletLogin = useSvelteComponent(WalletLogin);

  const nextGraphAuth = useNextGraphAuth() as unknown as NextGraphAuth | undefined;
  const { session, login, logout } = nextGraphAuth || {};

  const isAuthenticated = Boolean(session?.sessionId);

  return (
  <BrowserNGLdoProvider>
    <OnboardingProvider>
      <Router>
        <Routes>
          <Route path="/onboarding"
                 element={<ProtectedRoute hasSession={isAuthenticated} children={<SocialContractPage />} />} />
          <Route path="/onboarding/social-contract"
                 element={<ProtectedRoute hasSession={isAuthenticated} children={<SocialContractAgreementPage />} />} />
          <Route path="/onboarding/claim-identity"
                 element={<ProtectedRoute hasSession={isAuthenticated} children={<ClaimIdentityPage />} />} />
          <Route path="/onboarding/accept-connection"
                 element={<ProtectedRoute hasSession={isAuthenticated} children={<AcceptConnectionPage />} />} />
          <Route path="/join-group" element={<ProtectedRoute hasSession={isAuthenticated} children={<GroupJoinPage />} />} />

          <Route path="/wallet/create" element={<ReactWalletCreate />} />
          <Route path="/wallet/login" element={<ReactWalletLogin />} />

          <Route path="/*" element={
            <ProtectedRoute hasSession={isAuthenticated} children={
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

          } />
          <Route path="/signup" element={<PersonalDataVaultPage />} />
          <Route path="/register" element={<PersonalDataVaultPage />} />
          <Route path="/login" element={<LoginPage />} />

        </Routes>
      </Router>
    </OnboardingProvider>
  </BrowserNGLdoProvider>);
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppRoutes />
    </ThemeProvider>
  );
}

export default App;