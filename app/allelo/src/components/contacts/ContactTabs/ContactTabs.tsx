import { Box, Tabs, Tab, Typography } from '@mui/material';
import { List as ListIcon, Hub, Map } from '@mui/icons-material';

interface ContactTabsProps {
  tabValue: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  contactCount: number;
  isLoading: boolean;
}

export const ContactTabs = ({ tabValue, onTabChange, contactCount, isLoading }: ContactTabsProps) => {
  const renderTabContent = () => {
    if (tabValue === 1) {
      return (
        <Box sx={{ 
          p: 0, 
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              textAlign: 'center'
            }}>
              <Box>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Loading network...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Building your contact network view
                </Typography>
              </Box>
            </Box>
          ) : contactCount === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              textAlign: 'center'
            }}>
              <Box>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No contacts in network
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Import some contacts to see your network!
                </Typography>
              </Box>
            </Box>
          ) : (
            <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden', p: 3 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Network View
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Network visualization spec is available in this Figma file https://www.figma.com/design/FZSZt0wZ4Fx684ys2cwzTU/Network-Graph-view?node-id=0-1&t=esOM3cSp1FKhK1fW-1
              </Typography>
            </Box>
          )}
        </Box>
      );
    }


    return null;
  };

  return (
    <Box sx={{ 
      flexShrink: 0,
      mb: 1,
      width: { xs: 'calc(100% + 20px)', md: '100%' }, 
      maxWidth: { xs: 'calc(100vw - 0px)', md: '100%' }, 
      overflow: 'hidden',
      mx: { xs: '-10px', md: 0 },
      boxSizing: 'border-box'
    }}>
      <Tabs
        value={tabValue}
        onChange={onTabChange}
        aria-label="contact view tabs"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          '& .MuiTab-root': {
            minHeight: 56,
            textTransform: 'none',
            fontWeight: 500,
            minWidth: { xs: 80, sm: 120 },
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}
      >
        <Tab icon={<ListIcon />} label="List" />
        <Tab icon={<Hub />} label="Network" />
        <Tab icon={<Map />} label="Map" />
      </Tabs>
      
      {/* Tab Content for Network view only */}
      {tabValue === 1 && (
        <Box sx={{ 
          flex: 1,
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {renderTabContent()}
        </Box>
      )}
    </Box>
  );
};