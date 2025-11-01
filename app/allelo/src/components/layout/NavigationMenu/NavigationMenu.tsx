import { forwardRef } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Badge,
  Collapse
} from '@mui/material';
import {
  UilAngleUp as ExpandLess,
  UilAngleDown as ExpandMore
} from '@iconscout/react-unicons';
import type { NavigationMenuProps, NavItem } from './types';

export const NavigationMenu = forwardRef<HTMLUListElement, NavigationMenuProps>(
  ({ navItems, expandedItems, isActiveRoute, onToggleExpanded, onNavigation }, ref) => {

    const isParentActive = (item: NavItem) => {
      if (item.children) {
        return item.children.some(child => isActiveRoute(child.path));
      }
      return false;
    };

    const renderNavItem = (item: NavItem, level: number = 0) => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpanded = expandedItems.has(item.text);
      const isActive = isActiveRoute(item.path);
      const isParentOfActive = isParentActive(item);
      
      return (
        <div key={item.text}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                if (hasChildren) {
                  onToggleExpanded(item.text);
                } else {
                  onNavigation(item.path);
                }
              }}
              selected={isActive || isParentOfActive}
              sx={{
                mx: 0,
                ml: 0,
                pl: level > 0 ? 4 : 3,
                borderRadius: 0,
                minHeight: 48,
                borderRightColor: 'primary.main',
                '&.Mui-selected': {
                  backgroundColor: 'rgba(0,0,0,0.34)',
                  color: 'text.primary',
                  borderRight: 0,
                  '&:hover': {
                    backgroundColor: 'rgba(0,0,0,0.34)',
                  },
                },
              }}
            >
              <ListItemIcon sx={{
                minWidth: 40,
                color: isActive ? "#fff" : "inherit",
                backgroundColor: isActive ? '#000' : 'transparent',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {item.badge ? (
                  <Badge badgeContent={item.badge} color="error">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontSize: '0.875rem',
                  fontWeight: isActive || isParentOfActive ? 600 : 500,
                  noWrap: true,
                  color: isActive ? "#fff" : "#000",
                  pl: 2
                }}
              />
              {hasChildren && (
                isExpanded ? <ExpandLess /> : <ExpandMore />
              )}
            </ListItemButton>
          </ListItem>
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.children?.map((child) => renderNavItem(child, level + 1))}
              </List>
            </Collapse>
          )}
        </div>
      );
    };

    return (
      <List ref={ref} sx={{ py: 0}}>
        {navItems.map((item) => renderNavItem(item))}
      </List>
    );
  }
);

NavigationMenu.displayName = 'NavigationMenu';