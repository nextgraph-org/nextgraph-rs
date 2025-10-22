import { forwardRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  Search,
  FilterList,
} from '@mui/icons-material';
import type { QuickActionsProps } from '../types';
import type { ContentType } from '@/types/userContent';

export const QuickActions = forwardRef<HTMLDivElement, QuickActionsProps>(
  ({ 
    searchQuery, 
    onSearchChange, 
    selectedTab, 
    onTabChange,
    filterMenuAnchor,
    onFilterMenuOpen,
    onFilterMenuClose,
    contentStats 
  }, ref) => {
    const contentTypes: Array<{ type: ContentType | 'all', label: string }> = [
      { type: 'all', label: 'All' },
      { type: 'post', label: 'Posts' },
      { type: 'offer', label: 'Offers' },
      { type: 'want', label: 'Wants' },
      { type: 'image', label: 'Images' },
      { type: 'link', label: 'Links' },
      { type: 'file', label: 'Files' },
      { type: 'article', label: 'Articles' },
    ];

    return (
      <Box ref={ref} sx={{ mb: 3 }}>
        {/* Search Bar */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            placeholder="Search your content..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            size="small"
          />
          <IconButton onClick={onFilterMenuOpen}>
            <FilterList />
          </IconButton>
        </Box>

        {/* Content Type Tabs */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {contentTypes.map(({ type, label }) => (
            <Chip
              key={type}
              label={`${label} ${type === 'all' ? `(${contentStats.totalItems})` : `(${contentStats.byType[type as ContentType] || 0})`}`}
              onClick={() => onTabChange(type)}
              variant={selectedTab === type ? 'filled' : 'outlined'}
              color={selectedTab === type ? 'primary' : 'default'}
              size="small"
            />
          ))}
        </Box>

        {/* Filter Menu */}
        <Menu
          anchorEl={filterMenuAnchor}
          open={Boolean(filterMenuAnchor)}
          onClose={onFilterMenuClose}
        >
          {contentTypes.map(({ type, label }) => (
            <MenuItem key={type} onClick={() => { onTabChange(type); onFilterMenuClose(); }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{label}</span>
                </Box>
                <Chip 
                  size="small" 
                  label={type === 'all' ? contentStats.totalItems : (contentStats.byType[type as ContentType] || 0)} 
                  variant="outlined" 
                />
              </Box>
            </MenuItem>
          ))}
        </Menu>
      </Box>
    );
  }
);

QuickActions.displayName = 'QuickActions';