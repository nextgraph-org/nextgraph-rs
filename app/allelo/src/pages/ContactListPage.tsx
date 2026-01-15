import {useMemo, useState} from 'react';
import {
  ContactListHeader,
} from '@/components/contacts';
import {ContactMapTab} from '@/components/contacts/ContactMapTab';
import {ContactListTab} from '@/components/contacts/ContactListTab';
import {ContactNetworkTab} from '@/components/contacts/ContactNetworkTab';
import {useSearchParams} from 'react-router-dom';
import {TabItem, TabManager} from "@/components/ui/TabManager/TabManager.tsx";
import {Box, List} from '@mui/material';
import {Hub, Map} from '@mui/icons-material';
import {useGreenCheck} from "@/hooks/useGreenCheck.ts";
import {GreenCheckConnectionDialog} from "@/components/account/GreenCheckConnectionDialog";

const ContactListPage = () => {
  const [manageMode, setManageMode] = useState(false);
  const [searchParams] = useSearchParams();
  const {handleGreencheckConnect, showGreencheckDialog, setShowGreencheckDialog} = useGreenCheck();

  const mode = searchParams.get('mode');

  const [tabValue, setTabValue] = useState<number>(0);

  const tabItems = useMemo<TabItem[]>(
    () => [
      {label: "List", icon: <List/>, content: 
          <ContactListTab handleGreencheckConnect={handleGreencheckConnect} manageMode={manageMode} setManageMode={setManageMode}/>},
      {label: "Network", icon: <Hub/>, content: <ContactNetworkTab/>},
      {label: "Map", icon: <Map/>, content: <ContactMapTab/>},
    ],
    [handleGreencheckConnect, manageMode]
  );
  return <Box sx={{
    width: '100%',
    height: tabValue === 1 || tabValue === 2 ? '100%' : '100%',
    maxWidth: {xs: '100vw', md: '100%'},
    boxSizing: 'border-box',
    mx: {xs: 0, md: 'auto'},
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  }}>
    <ContactListHeader
      mode={mode}
      manageMode={manageMode}
      setManageMode={setManageMode}
      currentTab={tabValue}
      handleGreencheckConnect={handleGreencheckConnect}
    />
    <Box sx={{flex: 1, minHeight: 0, display: "flex", flexDirection: "column"}}>
      <TabManager tabItems={tabItems} onChange={setTabValue}/>
    </Box>
    <GreenCheckConnectionDialog show={showGreencheckDialog} setShow={setShowGreencheckDialog}/>
  </Box>
};

export default ContactListPage;
