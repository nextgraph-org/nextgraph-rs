import { forwardRef } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import {
  UilDashboard as Dashboard,
} from '@iconscout/react-unicons';
import type { GroupTabsProps } from './types';

export const GroupTabs = forwardRef<HTMLDivElement, GroupTabsProps>(
  ({ tabValue, onTabChange }, ref) => {
    const tabs = [
      { label: 'Overview', icon: <Dashboard /> },
     /* { label: 'Chat', icon: <Chat /> },*/
      // { label: 'Docs', icon: <Description /> },
    ];

    return (
      <Box
        ref={ref}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          px: { xs: 1, sm: 0 }
        }}
      >
        <Tabs
          value={tabValue}
          onChange={onTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            '& .MuiTab-root': {
              minHeight: { xs: 48, sm: 56 },
              textTransform: 'none',
              fontWeight: 500,
              minWidth: { xs: 80, sm: 120 },
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              px: { xs: 1, sm: 2 }
            }
          }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              icon={tab.icon}
              label={tab.label}
              sx={{
                '& .MuiSvgIcon-root': {
                  fontSize: { xs: '1rem', sm: '1.25rem' }
                }
              }}
            />
          ))}
        </Tabs>
      </Box>
    );
  }
);

GroupTabs.displayName = 'GroupTabs';