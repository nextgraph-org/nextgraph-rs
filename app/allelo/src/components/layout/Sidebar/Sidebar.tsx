import {forwardRef} from 'react';
import {Box} from '@mui/material';
import {NavigationMenu} from '../NavigationMenu';
import type {SidebarProps} from './types';
import {RCardsListSideWidget, RCardsSideWidget} from "@/components/rcards/RCardsSideWidget";
import {useDashboardStore} from "@/stores/dashboardStore";

export const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
  ({
     navItems,
     expandedItems,
     isActiveRoute,
     onToggleExpanded,
     onNavigation,
     currentPath,
   }, ref) => {
    const {showRCardsWidget} = useDashboardStore();
    const showCategories = currentPath === '/contacts' && showRCardsWidget;
    const showRCardInfo = currentPath === '/rcards';

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

        {showCategories && <RCardsSideWidget/>}
        {showRCardInfo && <RCardsListSideWidget/>}
      </Box>
    );
  }
);

Sidebar.displayName = 'Sidebar';