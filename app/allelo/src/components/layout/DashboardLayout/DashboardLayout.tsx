import {useState, useEffect, useRef} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  UilUsersAlt,
  UilCommentAltLines,
  UilSitemap,
  UilApps, UilUser,
} from '@iconscout/react-unicons';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import {Sidebar} from '../Sidebar';
import {MobileDrawer} from '../MobileDrawer';
import {LogoLeft, LogoRight, Logo } from '@/components/ui/Logo';
import type {NavItem} from '../NavigationMenu/types';
import {useRelationshipCategories} from '@/hooks/useRelationshipCategories';
import type {DashboardLayoutProps} from './types';
import {useDashboardStore} from '@/stores/dashboardStore';
import {
  DndContext,
  KeyboardSensor,
  MouseSensor, pointerWithin,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {CircleLogo} from "@/components/ui/CircleLogo.tsx";

const drawerWidth = 280;

export const DashboardLayout = ({children}: DashboardLayoutProps) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const {headerZone, footerZone, showOverflow, setMainRef} = useDashboardStore();

  // Register the ref with the store
  useEffect(() => {
    setMainRef(mainRef);
  }, [setMainRef]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Network']));
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {getCategoriesArray} = useRelationshipCategories();

  const mode = searchParams.get('mode');
  const isInviteMode = mode === 'invite' || mode === 'create-group';

  const navItems: NavItem[] = [
    {text: 'Home', icon: <UilApps size="20"/>, path: '/'},
    {text: 'Dashboard', icon: <UilUser size="20"/>, path: '/account'},
    {text: 'Network', icon: <UilSitemap size="20"/>, path: '/contacts'},
    {text: 'Groups', icon: <UilUsersAlt size="20"/>, path: '/groups'},
    {text: 'Chat', icon: <UilCommentAltLines size="20"/>, path: '/messages'},
  ];

  const mouseSensor = useSensor(MouseSensor, {activationConstraint: {
      delay: 100,
      tolerance: 0
    }});
  const touchSensor = useSensor(TouchSensor, {activationConstraint: {
      delay: 200,
      tolerance: 10
    }});
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  const relationshipCategories = getCategoriesArray();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const toggleExpanded = (itemText: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemText)) {
        newSet.delete(itemText);
      } else {
        newSet.add(itemText);
      }
      return newSet;
    });
  };

  const isActiveRoute = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    return path !== '/' && location.pathname.startsWith(path);
  };


  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin}>
      <Box sx={{
        display: 'grid',
        gridTemplateRows: (() => {
          const baseRows = ["auto", "minmax(0,1fr)"];
          const rows: string[] = [];

          // Add header zone if present
          if (headerZone) {
            rows.push("auto");
          }

          // Add main content area
          rows.push(...baseRows);

          // Add footer zone if present or default footer
          if (footerZone || (!isInviteMode && isMobile)) {
            rows.push("auto");
          }

          return rows.join(" ");
        })(),
        gridTemplateColumns: {xs: "1fr", md: "280px 1fr"},
        gridTemplateAreas: (() => {
          if (headerZone && footerZone) {
            return {
              xs: `"header"
              "headerzone"
              "content"
              "footerzone"
              "footer"
              `,
              md: `
            "header header"
            "menu headerzone"
            "menu content"
            "footerzone footerzone"
            `
            };
          } else if (headerZone) {
            return {
              xs: `"header"
              "headerzone"
              "content"
              "footer"`,
              md: `
            "header header"
            "menu headerzone"
            "menu content"
            "footer footer"
            `
            };
          } else if (footerZone) {
            return {
              xs: `"header"
              "content"
              "footerzone"
              "footer"
              `,
              md: `
            "header header"
            "menu content"
            "footerzone footerzone"
            `
            };
          } else {
            return {
              xs: `"header"
              "content"
              "footer"`,
              md: `
            "header header"
            "menu content"
            "footer footer"
            `
            };
          }
        })(),
        inset: 0,
        backgroundColor: 'background.default',
        position: "fixed",
        pt: {xs: 'var(--safe-area-inset-top)'},
        pr: {md:2, xs: 0},
        pb: {md:3, xs: 'var(--safe-area-inset-bottom)'}
      }}>

        {/* Logo Header Bar */}
        <Box
          sx={{
            gridArea: "header",
            display: isMobile ? 'none' : 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: isMobile ? 0 : 2,
            pl: 0,
            opacity: "100%",
            gap: isMobile ? 0 : 2,
          }}
        >
          {isMobile && (
            <>
              <LogoLeft/>
              <CircleLogo width={50} height={50}/>
              <LogoRight/>
            </>
          )}

          {!isMobile && (
            <>
              <CircleLogo width={50} height={50}/>
              <Logo width={200} height={50}/>
            </>
          )}
          
        </Box>

        {!isInviteMode && !isMobile && (
          <Box
            component="nav"
            sx={{width: {md: drawerWidth}, flexShrink: {md: 0}, gridArea: "menu", zIndex: 0, pr: 1}}
          >
            <Sidebar
              navItems={navItems}
              expandedItems={expandedItems}
              isActiveRoute={isActiveRoute}
              onToggleExpanded={toggleExpanded}
              onNavigation={handleNavigation}
              currentPath={location.pathname}
              relationshipCategories={relationshipCategories}
            />
          </Box>
        )}

        {!isInviteMode && isMobile && (
          <MobileDrawer
            drawerWidth={drawerWidth}
            mobileOpen={mobileOpen}
            onDrawerClose={handleDrawerToggle}
            zIndex={theme.zIndex.drawer}
            navItems={navItems}
            expandedItems={expandedItems}
            isActiveRoute={isActiveRoute}
            onToggleExpanded={toggleExpanded}
            onNavigation={handleNavigation}
            currentPath={location.pathname}
            relationshipCategories={relationshipCategories}
          />
        )}

        {headerZone && (
          <Box
            sx={{
              gridArea: "headerzone",
              backgroundColor: 'background.default',
              pt: isInviteMode ? 2 : {xs: 1, md: 1},
              pr: isInviteMode ? 2 : {xs: 1, md: 1.5},
              pl: isInviteMode ? 2 : {xs: 1, md: 1.5},
              pb: 0,
            }}
          >
            {headerZone}
          </Box>
        )}

        <Box
          ref={mainRef}
          component="main"
          sx={{
            width: '100%',
            backgroundColor: 'background.paper',
            overflow: showOverflow ? 'auto' : 'hidden',
            maxWidth: '100vw',
            gridArea: "content",
            pt: isInviteMode ? 2 : {xs: 1, md: 2},
            pr: isInviteMode ? 2 : {xs: 1, md: 1.5},
            pb: isInviteMode ? 2 : {xs: 1, md: 1.5},
            pl: isInviteMode ? 2 : {xs: 1, md: 3},
            borderRadius: "2%"
          }}
        >
          {children}
        </Box>

        {footerZone && (
          <Box
            sx={{
              gridArea: "footerzone",
              backgroundColor: 'background.default',
            }}
          >
            {footerZone}
          </Box>)}
        {isMobile && !isInviteMode && (
          <Box sx={{gridArea: "footer", width: "100vw"}}>
            <BottomNavigation navigationItems={navItems}/>
          </Box>
        )}
      </Box>
    </DndContext>
  );
};
