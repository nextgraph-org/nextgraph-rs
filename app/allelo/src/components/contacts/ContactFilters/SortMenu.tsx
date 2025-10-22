import {
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  TrendingUp,
  SortByAlpha,
  Business,
  LocationOn,
  Label
} from '@mui/icons-material';

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
      <MenuItem disabled={true} onClick={() => onSortChange('mostActive')}>
        <ListItemIcon><TrendingUp fontSize="small"/></ListItemIcon>
        <ListItemText>Most Active</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => onSortChange('name')}>
        <ListItemIcon><SortByAlpha fontSize="small"/></ListItemIcon>
        <ListItemText>Name</ListItemText>
      </MenuItem>
      <MenuItem onClick={() => onSortChange('organization')}>
        <ListItemIcon><Business fontSize="small"/></ListItemIcon>
        <ListItemText>Company</ListItemText>
      </MenuItem>
      <MenuItem disabled={true} onClick={() => onSortChange('nearMeNow')}>
        <ListItemIcon><LocationOn fontSize="small"/></ListItemIcon>
        <ListItemText>Near Me Now</ListItemText>
      </MenuItem>
      <MenuItem disabled={true} onClick={() => onSortChange('sharedTags')}>
        <ListItemIcon><Label fontSize="small"/></ListItemIcon>
        <ListItemText>Shared Tags</ListItemText>
      </MenuItem>
    </Menu>
  );
};