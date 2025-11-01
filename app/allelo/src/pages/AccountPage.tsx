import {useMemo, useState} from 'react';
import {useNextGraphAuth} from '@/lib/nextgraph.ts';
import {isNextGraphEnabled} from '@/utils/featureFlags.ts';
import {
  Typography,
  Box,
  Button,
} from '@mui/material';
import {
  UilUser,
  UilShield,
  UilSetting,
  UilSignout, UilSearch, UilBell, UilFileAlt, UilRss,
} from '@iconscout/react-unicons';
import type {PersonhoodCredentials} from '@/types/personhood';
import {NextGraphAuth} from "@/types/nextgraph";
import {mockPersonhoodCredentials} from "@/mocks/profile";
import {useContactData} from "@/hooks/contacts/useContactData.ts";
import {NotificationsPage} from "@/components/notifications/NotificationsPage";
import {AccountSettings} from "@/components/account/AccountPage/AccountSettings";
import {TabItem, TabManager} from "@/components/ui/TabManager/TabManager.tsx";
import { AccountPageProps, ProfileSection } from '@/components/account/AccountPage';
import { MyStream } from '@/components/account/AccountPage/MyStream';
import { MyDocs } from '@/components/account/AccountPage/MyDocs';
import { SocialQueries } from '@/components/account/AccountPage/SocialQueries';
import RCardList from "@/components/rcards/RCardList/RCardList.tsx";

export const AccountPageContent = ({
                                     profileData,
                                     handleLogout: externalHandleLogout,
                                     isNextGraph
                                   }: AccountPageProps) => {

  const [personhoodCredentials] = useState<PersonhoodCredentials>(mockPersonhoodCredentials);

  const tabItems = useMemo<TabItem[]>(
    () => [
      {label: "Alerts", icon: <UilBell size="20"/>, content: <NotificationsPage/>},
      {label: "My Stream", icon: <UilRss size="20"/>, content: <MyStream/>},
      {label: "My Docs", icon: <UilFileAlt size="20"/>, content: <MyDocs/>},
      {label: "Queries", icon: <UilSearch size="20"/>, content: <SocialQueries/>},
      {label: "My Cards", icon: <UilShield size="20"/>, content: <RCardList/>},
      {label: "Profile", icon: <UilUser size="20"/>, content: <ProfileSection initialProfileData={profileData}/>},
      {label: "Settings", icon: <UilSetting size="20"/>, content: <AccountSettings personhoodCredentials={personhoodCredentials}/>},
    ],
    [profileData, personhoodCredentials]
  );

  return (
    <Box sx={{
      width: '100%',
      maxWidth: {xs: '100vw', md: '100%'},
      overflow: 'hidden',
      boxSizing: 'border-box',
      p: {xs: '10px', md: 0},
      mx: {xs: 0, md: 'auto'}
    }}>
      {/* Header */}
      <Box sx={{
        mb: {xs: 1, md: 1},
        width: '100%',
        overflow: 'hidden',
        minWidth: 0
      }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            fontSize: {xs: '1.5rem', md: '2.125rem'},
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          Dashboard
        </Typography>
      </Box>

      {/* Navigation Tabs */}
      <TabManager tabItems={tabItems}/>

      {/* Logout Button */}
      {isNextGraph && (
        <Box sx={{mt: 3, mb: 2, textAlign: 'center'}}>
          <Button
            variant="outlined"
            startIcon={<UilSignout size="20"/>}
            onClick={externalHandleLogout}
            sx={{
              color: 'error.main',
              borderColor: 'error.main',
              '&:hover': {
                borderColor: 'error.dark',
                backgroundColor: 'error.light'
              }
            }}
          >
            Logout
          </Button>
        </Box>
      )}
    </Box>
  );
};

const NextGraphAccountPage = () => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {contact} = useContactData(null, true);

  const handleLogout = async () => {
    try {
      if (nextGraphAuth?.logout && typeof nextGraphAuth.logout === 'function') {
        await nextGraphAuth.logout();
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return <AccountPageContent profileData={contact} handleLogout={handleLogout} isNextGraph={true}/>;
};

const MockAccountPage = () => {
  const {contact} = useContactData("myProfileId");
  return <AccountPageContent profileData={contact} isNextGraph={false}/>;
};


export const AccountPage = () => {
  const isNextGraph = isNextGraphEnabled();

  if (isNextGraph) {
    return <NextGraphAccountPage/>;
  }

  return <MockAccountPage/>;
};