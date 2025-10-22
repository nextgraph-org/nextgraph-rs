import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BottomNavigation as MuiBottomNavigation, 
  BottomNavigationAction, 
  Paper 
} from '@mui/material';
import {
  Dashboard,
  Hub,
  Chat,
  Groups,
} from '@mui/icons-material';

const BottomNavigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { label: 'Home', icon: <Dashboard />, path: '/' },
    { label: 'Network', icon: <Hub />, path: '/contacts' },
    { label: 'Groups', icon: <Groups />, path: '/groups' },
    { label: 'Chat', icon: <Chat />, path: '/messages' },
  ];

  const getCurrentValue = () => {
    const currentPath = location.pathname;
    if (currentPath === '/') return '/';
    
    // Handle network path - should highlight Network tab
    if (currentPath.startsWith('/contacts')) {
      return '/contacts';
    }
    
    // Groups has its own tab now
    if (currentPath.startsWith('/groups')) {
      return '/groups';
    }
    
    const activeItem = navigationItems.find(item => 
      item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path))
    );
    return activeItem ? activeItem.path : '/';
  };

  const handleChange = (_event: React.SyntheticEvent, newValue: string) => {
    navigate(newValue);
  };

  return (
    <Paper 
      sx={{ 
        bottom: 0,
        left: 0, 
        right: 0, 
        zIndex: 1000,
        borderTop: 1,
        borderColor: 'divider',
        gridArea: "footer"
      }} 
      elevation={3}
    >
      <MuiBottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        showLabels
        sx={{
          '& .MuiBottomNavigationAction-root': {
            color: 'text.secondary',
            '&.Mui-selected': {
              color: 'primary.main',
            },
          },
        }}
      >
        {navigationItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            value={item.path}
            icon={item.icon}
          />
        ))}
      </MuiBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;