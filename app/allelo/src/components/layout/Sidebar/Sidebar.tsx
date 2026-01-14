import {forwardRef} from 'react';
import {Box} from '@mui/material';
import {NavigationMenu} from '../NavigationMenu';
import type {SidebarProps} from './types';

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  ({
     navItems,
     expandedItems,
     isActiveRoute,
     onToggleExpanded,
     onNavigation,
   }, ref) => {
    return (
      <Box
        ref={ref}
        sx={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}
      >

        <NavigationMenu
          navItems={navItems}
          expandedItems={expandedItems}
          isActiveRoute={isActiveRoute}
          onToggleExpanded={onToggleExpanded}
          onNavigation={onNavigation}
        />

      </Box>
    );
  }
);

Sidebar.displayName = 'Sidebar';