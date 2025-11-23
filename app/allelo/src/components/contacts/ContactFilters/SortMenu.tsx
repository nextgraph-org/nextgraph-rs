import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  UilChartLine,
  UilSortAmountDown,
  UilBuilding,
  UilMapMarker,
  UilTag
} from '@iconscout/react-unicons';

interface SortMenuProps {
  anchorEl: null | HTMLElement;
  open: boolean;
  onClose: () => void;
  onSortChange: (sortBy: string) => void;
}

export const SortMenu = ({ anchorEl, open, onClose, onSortChange }: SortMenuProps) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      <MenuItem onClick={() => onSortChange('mostRecentInteraction')}>
        <ListItemIcon><UilChartLine size="20"/></ListItemIcon>
        <ListItemText>Last Interaction</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => onSortChange('name')}>
        <ListItemIcon><UilSortAmountDown size="20"/></ListItemIcon>
        <ListItemText>Name</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => onSortChange('organization')}>
        <ListItemIcon><UilBuilding size="20"/></ListItemIcon>
        <ListItemText>Company</ListItemText>
      </MenuItem>
      <MenuItem disabled={true} onClick={() => onSortChange('nearMeNow')}>
        <ListItemIcon><UilMapMarker size="20"/></ListItemIcon>
        <ListItemText>Near Me Now</ListItemText>
      </MenuItem>
      <MenuItem disabled={true} onClick={() => onSortChange('sharedTags')}>
        <ListItemIcon><UilTag size="20"/></ListItemIcon>
        <ListItemText>Shared Tags</ListItemText>
      </MenuItem>
    </Menu>
  );
};