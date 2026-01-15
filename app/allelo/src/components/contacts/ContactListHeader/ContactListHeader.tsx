import {Typography, Box, Menu, MenuItem, ListItemIcon, ListItemText, IconButton} from '@mui/material';
import {Button} from '@/components/ui';
import {
  UilPlus,
  UilCloudDownload,
  UilAngleDown,
  UilSetting,
  UilArrowLeft,
  UilCheck
} from '@iconscout/react-unicons';
import {useNavigate} from 'react-router-dom';
import {useCallback, useEffect, useState} from 'react';
import {useIsMobile} from "@/hooks/useIsMobile.ts";
import {useDashboardStore} from "@/stores/dashboardStore";

interface ContactListHeaderProps {
  mode?: string | null;
  manageMode?: boolean;
  setManageMode?: (value: boolean) => void;
  currentTab: number;
  handleGreencheckConnect: () => void;
}

export const ContactListHeader = ({
                                    mode,
                                    manageMode,
                                    setManageMode,
                                    currentTab,
                                    handleGreencheckConnect
                                  }: ContactListHeaderProps) => {
  const navigate = useNavigate();
  const {setShowRCardsWidget} = useDashboardStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const isMobile = useIsMobile();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleAddContact = useCallback(() => {
    handleClose();
    navigate('/contacts/create');
  }, [handleClose, navigate]);

  const handleImport = useCallback(() => {
    handleClose();
    navigate('/import');
  }, [handleClose, navigate]);

  // const handleInvite = useCallback(() => {
  //   handleClose();
  //   navigate('/invite');
  // }, [handleClose, navigate]);

  const handleManageClick = useCallback(() => {
    if (setManageMode) {
      setManageMode(!manageMode);
    }
  }, [manageMode, setManageMode]);

  const handleBackClick = useCallback(() => {
    if (setManageMode) {
      setManageMode(false);
    }
  }, [setManageMode]);


  useEffect(() => {
    if (setManageMode) {
      setShowRCardsWidget(manageMode ?? false);
    }
  }, [setShowRCardsWidget, setManageMode, manageMode]);

  const getTitle = () => {
    if (manageMode) return 'Manage Contacts';
    if (mode === 'create-group') return 'Select Group Members';
    if (mode === 'invite') return 'Select Contact to Invite';
    return 'Contacts';
  };

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: {xs: 1, md: 1},
      gap: 1,
      width: '100%',
      overflow: 'hidden',
      minWidth: 0,
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      <Box sx={{flex: 1, minWidth: 0, overflow: 'hidden', display: "flex", alignItems: 'center', gap: 1}}>
        {manageMode && (
          <IconButton
            onClick={handleBackClick}
            sx={{
              p: 0.5,
              color: 'text.primary',
              mr: 3
            }}
          >
            <UilArrowLeft size="20"/>
          </IconButton>
        )}
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 700,
            mb: {xs: 0, md: 0},
            fontSize: {xs: '1.5rem', md: '2.125rem'},
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {getTitle()}
        </Typography>
      </Box>
      {(currentTab === 1) && <Button
          variant="contained"
          size="small"
          onClick={handleGreencheckConnect}
          sx={{p: 1, minWidth: "26px"}}
      >
          <UilCheck size="20" sx={{p: 0, mr: {xs: 0, md: 1}}}/>
          Get Network
      </Button>}
      {mode !== 'invite' && (<>
        {currentTab === 0 && !manageMode && <Button
            variant="contained"
            onClick={handleManageClick}
            sx={{p: 1, minWidth: "26px"}}
        >
          {isMobile ? <UilSetting size="20" sx={{p: 0}}/> : <><UilSetting size="20" sx={{p: 0, mr: 1}}/>Manage</>}
        </Button>}
        {(currentTab !== 0 || !manageMode) && <Button
            variant="contained"
            endIcon={!isMobile && <UilAngleDown size="20"/>}
            onClick={handleClick}
            sx={{p: 1, minWidth: "26px"}}
        >
          {isMobile ? <UilPlus size="20" sx={{p: 0}}/> : <><UilPlus size="20" sx={{p: 0, mr: 1}}/>Add</>}
        </Button>}
      </>)}

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={handleAddContact}>
          <ListItemIcon>
            <UilPlus size="20"/>
          </ListItemIcon>
          <ListItemText>Add Contact</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleImport}>
          <ListItemIcon>
            <UilCloudDownload size="20"/>
          </ListItemIcon>
          <ListItemText>Import</ListItemText>
        </MenuItem>
        {/* <MenuItem onClick={handleInvite}>
          <ListItemIcon>
            <UilQrcodeScan size="20"/>
          </ListItemIcon>
          <ListItemText>Invite</ListItemText>
        </MenuItem> */}
      </Menu>
    </Box>

  );
};