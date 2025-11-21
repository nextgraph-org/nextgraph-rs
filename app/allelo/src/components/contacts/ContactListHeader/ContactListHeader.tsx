import {Typography, Box, Menu, MenuItem, ListItemIcon, ListItemText, IconButton} from '@mui/material';
import {Button} from '@/components/ui';
import {UilPlus, UilCloudDownload, UilQrcodeScan, UilAngleDown, UilSetting, UilArrowLeft} from '@iconscout/react-unicons';
import {useNavigate} from 'react-router-dom';
import {useState} from 'react';
import {useIsMobile} from "@/hooks/useIsMobile.ts";
import {useDashboardStore} from "@/stores/dashboardStore";

interface ContactListHeaderProps {
  mode?: string | null;
  manageMode?: boolean;
  setManageMode?: (value: boolean) => void;
  currentTab: number;
}

export const ContactListHeader = ({
                                    mode,
                                    manageMode,
                                    setManageMode,
                                    currentTab
                                  }: ContactListHeaderProps) => {
  const navigate = useNavigate();
  const {showRCardsWidget, setShowRCardsWidget} = useDashboardStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const isMobile = useIsMobile();

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAddContact = () => {
    handleClose();
    navigate('/contacts/create');
  };

  const handleImport = () => {
    handleClose();
    navigate('/import');
  };

  const handleInvite = () => {
    handleClose();
    navigate('/invite');
  };

  const handleManageClick = () => {
    if (setManageMode) {
      setManageMode(!manageMode);
    }
    setShowRCardsWidget(!showRCardsWidget);
  };

  const handleBackClick = () => {
    if (setManageMode) {
      setManageMode(false);
    }
    setShowRCardsWidget(false);
  };

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
            <UilArrowLeft size="20" />
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
      {!manageMode && mode !== 'invite' && (
        <Box sx={{
          display: 'flex',
          gap: 1,
          justifyContent: 'flex-end'
        }}>
          {currentTab === 0 && <Button
            variant="contained"
            onClick={handleManageClick}
            sx={{p: 1, minWidth: "26px"}}
          >
            {isMobile ? <UilSetting size="20" sx={{p: 0}}/> : <><UilSetting size="20" sx={{p: 0, mr: 1}}/>Manage</>}
          </Button>}
          <Button
            variant="contained"
            endIcon={!isMobile && <UilAngleDown size="20"/>}
            onClick={handleClick}
            sx={{p: 1, minWidth: "26px"}}
          >
            {isMobile ? <UilPlus size="20" sx={{p: 0}}/> : <><UilPlus size="20" sx={{p: 0, mr: 1}}/>Add</>}
          </Button>
        </Box>
      )}

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
        </MenuItem>*/}
      </Menu>
    </Box>
  );
};