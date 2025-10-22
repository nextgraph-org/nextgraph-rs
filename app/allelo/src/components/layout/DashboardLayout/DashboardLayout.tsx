import {useState, useEffect, useRef, useCallback} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Badge,
} from '@mui/material';
import {
  Groups,
  Chat,
  Hub,
  Dashboard,
  Notifications,
  AutoAwesome,
  Person,
} from '@mui/icons-material';
import BottomNavigation from '@/components/navigation/BottomNavigation';
import {notificationService} from '@/services/notificationService';
import type {NotificationSummary} from '@/types/notification';
import {Sidebar} from '../Sidebar';
import {MobileDrawer} from '../MobileDrawer';
import type {NavItem} from '../NavigationMenu/types';
import {useRelationshipCategories} from '@/hooks/useRelationshipCategories';
import type {DashboardLayoutProps} from './types';
import {useDashboardStore} from '@/stores/dashboardStore';

const drawerWidth = 280;

export const DashboardLayout = ({children}: DashboardLayoutProps) => {
  const mainRef = useRef<HTMLElement | null>(null);
  const {headerZone, footerZone, showOverflow, setMainRef, showHeader} = useDashboardStore();

  // Register the ref with the store
  useEffect(() => {
    setMainRef(mainRef);
  }, [setMainRef]);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set(['Network']));
  const [notificationSummary, setNotificationSummary] = useState<NotificationSummary>({
    total: 0,
    unread: 0,
    pending: 0,
    byType: {vouch: 0, praise: 0, connection: 0, group_invite: 0, message: 0, system: 0}
  });
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {getCategoriesArray} = useRelationshipCategories();

  const mode = searchParams.get('mode');
  const isInviteMode = mode === 'invite' || mode === 'create-group';

  const navItems: NavItem[] = [
    {text: 'Home', icon: <Dashboard/>, path: '/'},
    {text: 'Network', icon: <Hub/>, path: '/contacts'},
    {text: 'Groups', icon: <Groups/>, path: '/groups'},
    {text: 'Chat', icon: <Chat/>, path: '/messages'},
  ];

  const relationshipCategories = getCategoriesArray().filter(cat => cat.id !== 'uncategorized');

  const loadNotificationSummary = useCallback(async () => {
    try {
      const summaryData = await notificationService.getNotificationSummary('current-user');
      setNotificationSummary(summaryData);
    } catch (error) {
      console.error('Failed to load notification summary:', error);
    }
  }, []);

  useEffect(() => {
    loadNotificationSummary();
  }, [loadNotificationSummary]);

  // Refresh notification count when navigating away from notifications page
  useEffect(() => {
    if (location.pathname !== '/notifications') {
      loadNotificationSummary();
    }
  }, [loadNotificationSummary, location.pathname]);

  // Listen for notification updates from the notifications page
  useEffect(() => {
    const handleNotificationUpdate = () => {
      loadNotificationSummary();
    };

    window.addEventListener('notifications-updated', handleNotificationUpdate);

    return () => {
      window.removeEventListener('notifications-updated', handleNotificationUpdate);
    };
  }, [loadNotificationSummary]);

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
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };


  return (
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
      position: "fixed"
    }}>
      {!isInviteMode && showHeader && (
        <AppBar
          position={"relative"}
          sx={{
            backgroundColor: 'background.paper',
            border: 'none',
            boxShadow: 'none',
            borderRadius: '0 !important',
            zIndex: theme.zIndex.drawer + 1,
            gridArea: "header"
          }}
        >
          <Toolbar sx={{
            justifyContent: 'space-between',
            minHeight: 64,
            height: 64,
            paddingTop: 0,
            paddingBottom: 0
          }}>
            <Box sx={{display: 'flex', alignItems: 'center'}}>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{
                  fontWeight: 600,
                  color: 'text.primary'
                }}
              >
                NAO
              </Typography>
            </Box>

            <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>
              <IconButton
                size="large"
                color="inherit"
                onClick={() => {
                  console.log('AI Assistant clicked');
                }}
                sx={{color: 'primary.main'}}
              >
                <AutoAwesome/>
              </IconButton>
              <IconButton
                size="large"
                color="inherit"
                onClick={() => navigate('/notifications')}
              >
                <Badge badgeContent={notificationSummary.unread} color="error">
                  <Notifications/>
                </Badge>
              </IconButton>
              <IconButton
                size="large"
                edge="end"
                aria-label="my account"
                onClick={() => navigate('/account')}
                color="inherit"
              >
                <Person/>
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {!isInviteMode && !isMobile && (
        <Box
          component="nav"
          sx={{width: {md: drawerWidth}, flexShrink: {md: 0}, gridArea: "menu"}}
        >
          <Drawer
            variant="permanent"
            open={true}
            sx={{
              '& .MuiDrawer-paper': {
                boxSizing: 'border-box',
                width: drawerWidth,
                backgroundColor: 'background.default',
                border: 'none',
                zIndex: theme.zIndex.drawer - 1,
              },
            }}
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
          </Drawer>
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
          backgroundColor: 'background.default',
          overflow: showOverflow ? 'auto' : 'hidden',
          maxWidth: '100vw',
          gridArea: "content",
          pt: isInviteMode ? 2 : {xs: 0, md: 1},
          pr: isInviteMode ? 2 : {xs: 0, md: 1.5},
          pb: isInviteMode ? 2 : {xs: 0, md: 1.5},
          pl: isInviteMode ? 2 : {xs: 0, md: 1.5},
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
        <Box sx={{gridArea: "footer"}}>
          <BottomNavigation/>
        </Box>
      )}
    </Box>
  );
};