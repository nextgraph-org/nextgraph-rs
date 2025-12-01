import {HashRouter as Router, Routes, Route, Navigate, useParams, Outlet} from 'react-router-dom';
import React from "react";
import {ThemeProvider} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import {OnboardingProvider} from '@/contexts/OnboardingContext';
import {BrowserNGLdoProvider, useNextGraphAuth} from '@/lib/nextgraph';
import type {NextGraphAuth} from '@/types/nextgraph';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {GroupJoinPage} from '@/components/groups/GroupJoinPage';
import {SocialContractAgreementPage} from '@/components/auth/SocialContractAgreementPage';
import {ClaimIdentityPage} from '@/components/auth/ClaimIdentityPage';
import {AcceptConnectionPage} from '@/components/auth/AcceptConnectionPage';
import {WelcomeToVaultPage} from '@/components/auth/WelcomeToVaultPage';
import ImportPage from '@/pages/ImportPage';
import ContactListPage from '@/pages/ContactListPage';
import ContactViewPage from '@/pages/ContactViewPage';
import {GroupListPage} from '@/pages/GroupListPage.tsx';
import GroupDetailPage from '@/pages/GroupDetailPage';
import {GroupInfoPage} from '@/components/groups/GroupInfoPage';
import CreateGroupPage from '@/pages/CreateGroupPage';
import {InvitationPage} from '@/components/invitations/InvitationPage';
import HomePage from '@/pages/HomePage';
import PostsOffersPage from '@/pages/PostsOffersPage';
import MessagesPage from '@/pages/MessagesPage';
import {NotificationsPage} from '@/components/notifications/NotificationsPage';
import {PhoneVerificationPage} from '@/components/account/PhoneVerificationPage';
import {createAppTheme} from '@/theme/theme';
import CreateContactPage from "@/pages/CreateContactPage";
import CreateProfilePage from "@/pages/CreateProfilePage";
import {AccountPage} from "@/pages/AccountPage.tsx";
import {OnboardingRoute} from '@/components/routing/OnboardingRoute';

import {useSvelteComponent} from "svelte-in-react";
import WalletCreate from "./svelte/WalletCreate.svelte";
import WalletLogin from "./svelte/WalletLogin.svelte";
import WalletLoginQr from "./svelte/WalletLoginQr.svelte";
import WalletLoginTextCode from "./svelte/WalletLoginTextCode.svelte";
import ScanQRTauri from "./svelte/ScanQRTauri.svelte";
import ScanQRWeb from "./svelte/ScanQRWeb.svelte";
import WalletInfo from "./svelte/WalletInfo.svelte";

const theme = createAppTheme('light');

const ProtectedRoute =
  ({children, hasSession, redirectPath = "/wallet/login"}: {
    children?: React.ReactNode,
    hasSession: boolean,
    redirectPath?: string
  }) => {
    if (!hasSession) {
      return <Navigate to={redirectPath} replace/>;
    }
    return children ? children : <Outlet/>;
  };

const InviteRedirect = () => {
  const {inviteCode} = useParams();
  return <Navigate to={`/wallet/create?i=${inviteCode}`} replace/>;
};

const RoutesWithAuth = () => {
  // Convert the Svelte components to React components
  const ReactWalletCreate = useSvelteComponent(WalletCreate);
  const ReactWalletLogin = useSvelteComponent(WalletLogin);
  const ReactWalletLoginQr = useSvelteComponent(WalletLoginQr);
  const ReactWalletLoginTextCode = useSvelteComponent(WalletLoginTextCode);
  const ReactWalletInfo = useSvelteComponent(WalletInfo);
  const ReactScanQr = useSvelteComponent(import.meta.env.TAURI_ENV_PLATFORM?
    ScanQRTauri : ScanQRWeb  );

  const nextGraphAuth = useNextGraphAuth() as unknown as NextGraphAuth | undefined;
  const {session} = nextGraphAuth || {};

  const isAuthenticated = Boolean(session?.sessionId);

  return (
    <Router>
      <Routes>
        <Route path="/onboarding/social-contract"
               element={<ProtectedRoute hasSession={isAuthenticated} children={<SocialContractAgreementPage/>}/>}/>
        <Route path="/onboarding/claim-identity"
               element={<ProtectedRoute hasSession={isAuthenticated} children={<ClaimIdentityPage/>}/>}/>
        <Route path="/onboarding/accept-connection"
               element={<ProtectedRoute hasSession={isAuthenticated} children={<AcceptConnectionPage/>}/>}/>
        <Route path="/join-group" element={<ProtectedRoute hasSession={isAuthenticated} children={<GroupJoinPage/>}/>}/>

        <Route path="/i/:inviteCode" element={<InviteRedirect/>}/>
        <Route path="/wallet/create" element={<ReactWalletCreate/>}/>
        <Route path="/wallet/login" element={<ReactWalletLogin/>}/>
        <Route path="/scanqr" element={<ReactScanQr/>}/>
        <Route path="/wallet/login-qr" element={<ReactWalletLoginQr/>}/>
        <Route path="/wallet/login-text-code" element={<ReactWalletLoginTextCode/>}/>
        

        <Route path="/onboarding/welcome" element={
          <ProtectedRoute hasSession={isAuthenticated} children={
            <DashboardLayout>
              <WelcomeToVaultPage/>
            </DashboardLayout>
          }/>
        }/>

        <Route path="/*" element={
          <OnboardingRoute hasSession={isAuthenticated}>
            <DashboardLayout>
              <Routes>
                <Route path="/" element={<HomePage/>}/>
                <Route path="/wallet" element={<ReactWalletInfo/>}/>
                <Route path="/import" element={<ImportPage/>}/>
                <Route path="/contacts" element={<ContactListPage/>}/>
                <Route path="/contacts/create" element={<CreateContactPage/>}/>
                <Route path="/contacts/:id" element={<ContactViewPage/>}/>
                <Route path="/groups" element={<GroupListPage/>}/>
                <Route path="/groups/create" element={<CreateGroupPage/>}/>
                <Route path="/groups/:groupId" element={<GroupDetailPage/>}/>
                <Route path="/groups/:groupId/info" element={<GroupInfoPage/>}/>
                <Route path="/posts" element={<PostsOffersPage/>}/>
                <Route path="/messages" element={<MessagesPage/>}/>
                <Route path="/notifications" element={<NotificationsPage/>}/>
                <Route path="/account" element={<AccountPage/>}/>
                <Route path="/account/create" element={<CreateProfilePage/>}/>
                <Route path="/verify-phone/:phone" element={<PhoneVerificationPage/>}/>
                <Route path="/invite" element={<InvitationPage/>}/>
              </Routes>
            </DashboardLayout>
          </OnboardingRoute>
        }/>

      </Routes>
    </Router>
  );
};

const AppRoutes = () => {
  return (
    <BrowserNGLdoProvider>
      <OnboardingProvider>
        <RoutesWithAuth/>
      </OnboardingProvider>
    </BrowserNGLdoProvider>
  );
};

function App() {
  // @ts-expect-error error
  window.ng_spa_loaded = true;
  // @ts-expect-error error
  if (window.ng_supported) {
    console.log("READY");
    // @ts-expect-error error
    window.everything_ready();
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline/>
      <AppRoutes/>
    </ThemeProvider>
  );
}

export default App;