import { forwardRef } from 'react';
import { Box, Drawer } from '@mui/material';
import { Sidebar } from '../Sidebar';
import type { MobileDrawerProps } from './types';

export const MobileDrawer = forwardRef<HTMLDivElement, MobileDrawerProps>(
  ({
    drawerWidth,
    mobileOpen,
    onDrawerClose,
    zIndex,
    navItems,
    expandedItems,
    isActiveRoute,
    onToggleExpanded,
    onNavigation,
    currentPath,
    relationshipCategories
  }, ref) => {
    return (
      <Box
        ref={ref}
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={onDrawerClose}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: 'background.default',
              border: 'none',
              zIndex: zIndex,
            },
          }}
        >
          <Sidebar
            navItems={navItems}
            expandedItems={expandedItems}
            isActiveRoute={isActiveRoute}
            onToggleExpanded={onToggleExpanded}
            onNavigation={onNavigation}
            currentPath={currentPath}
            relationshipCategories={relationshipCategories}
          />
        </Drawer>
      </Box>
    );
  }
);

MobileDrawer.displayName = 'MobileDrawer';