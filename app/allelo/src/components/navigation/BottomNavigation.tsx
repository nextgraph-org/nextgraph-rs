import {useLocation, useNavigate} from 'react-router-dom';
import {
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
  Paper
} from '@mui/material';
import {NavItem} from "@/components/layout/NavigationMenu";

type BottomNavigationProps = {
  navigationItems: NavItem[]
}

const BottomNavigation = ({navigationItems}: BottomNavigationProps) => {
  const location = useLocation();
  const navigate = useNavigate();

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
        sx={{ pb:1.5,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 4px',
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
            label={item.text}
            value={item.path}
            icon={item.icon}
          />
        ))}
      </MuiBottomNavigation>
    </Paper>
  );
};

export default BottomNavigation;