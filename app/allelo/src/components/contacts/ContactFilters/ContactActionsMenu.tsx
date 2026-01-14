import {useState} from 'react';
import {Button, Menu, MenuItem, ListItemIcon, ListItemText} from '@mui/material';
import {
  UilCodeBranch,
  UilLayerGroup,
  UilUserCheck,
  UilAngleDown
} from '@iconscout/react-unicons';

interface ContactActionsMenuProps {
  hasSelection?: boolean;
  onAutomaticDeduplication: () => void;
  onMergeContacts: () => void;
  onAssignRCard: () => void;
}

export const ContactActionsMenu = ({
  hasSelection = false,
  onAutomaticDeduplication,
  onMergeContacts,
  onAssignRCard,
}: ContactActionsMenuProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAutomaticDeduplication = () => {
    onAutomaticDeduplication();
    handleClose();
  };

  const handleMergeContacts = () => {
    onMergeContacts();
    handleClose();
  };

  const handleAssignRCard = () => {
    onAssignRCard();
    handleClose();
  };

  return (
    <>
      <Button
        variant="text"
        startIcon={<UilLayerGroup size="18"/>}
        endIcon={<UilAngleDown size="18"/>}
        onClick={handleClick}
        size="small"
        sx={{
          fontSize: '0.75rem',
          textTransform: 'none',
          color: 'primary.main',
          fontWeight: 500,
          minWidth: 'auto',
          width: 'auto',
          height: "10px"
        }}
      >
        Actions
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={handleAutomaticDeduplication}>
          <ListItemIcon><UilLayerGroup size="20"/></ListItemIcon>
          <ListItemText>Automatic deduplication</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMergeContacts} disabled={!hasSelection}>
          <ListItemIcon><UilCodeBranch size="20"/></ListItemIcon>
          <ListItemText>Merge selected contacts</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleAssignRCard} disabled={!hasSelection}>
          <ListItemIcon><UilUserCheck size="20"/></ListItemIcon>
          <ListItemText>Assign rCard to selected contacts</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};