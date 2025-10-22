import { forwardRef } from 'react';
import {
  Typography,
  Box,
  Avatar,
  Button,
  Card,
  CardContent,
  IconButton,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Business,
  PersonOutline,
  Groups,
  FamilyRestroom,
  Favorite,
  Home,
  LocationOn,
  Public,
  CheckCircle,
  Settings,
} from '@mui/icons-material';
import { DEFAULT_RCARDS } from '@/types/notification';

interface ProfileCard {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface JoinProcessProps {
  selectedProfileCard: string;
  customProfileCard: { id: string; name: string; [key: string]: unknown } | null;
  onProfileCardSelect: (cardName: string) => void;
  onEditProfileCard: (cardName: string, event: React.MouseEvent) => void;
  onJoinGroup: () => void;
}

export const JoinProcess = forwardRef<HTMLDivElement, JoinProcessProps>(
  ({
    selectedProfileCard,
    customProfileCard,
    onProfileCardSelect,
    onEditProfileCard,
    onJoinGroup,
  }, ref) => {
    const theme = useTheme();

    const getProfileCardIcon = (iconName: string) => {
      const iconMap: Record<string, React.ReactElement> = {
        Business: <Business />,
        PersonOutline: <PersonOutline />,
        Groups: <Groups />,
        FamilyRestroom: <FamilyRestroom />,
        Favorite: <Favorite />,
        Home: <Home />,
        LocationOn: <LocationOn />,
        Public: <Public />,
      };
      return iconMap[iconName] || <PersonOutline />;
    };

    const renderCustomCard = () => {
      if (!customProfileCard) return null;

      return (
        <Card
          key={customProfileCard.name}
          onClick={() => onProfileCardSelect(customProfileCard.name as string)}
          sx={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: 2,
            borderColor: selectedProfileCard === customProfileCard.name ? 
              (customProfileCard.color as string) : 'divider',
            backgroundColor: selectedProfileCard === customProfileCard.name 
              ? alpha((customProfileCard.color as string) || theme.palette.primary.main, 0.08)
              : 'background.paper',
            '&:hover': {
              borderColor: (customProfileCard.color as string),
              transform: 'translateY(-2px)',
              boxShadow: theme.shadows[4],
            },
          }}
        >
          <CardContent sx={{ p: 3, textAlign: 'center', position: 'relative' }}>
            <Avatar
              sx={{
                bgcolor: (customProfileCard.color as string) || theme.palette.primary.main,
                width: 48,
                height: 48,
                mx: 'auto',
                mb: 2,
                '& .MuiSvgIcon-root': { fontSize: 28 }
              }}
            >
              {getProfileCardIcon((customProfileCard.icon as string) || 'PersonOutline')}
            </Avatar>
            
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {customProfileCard.name as string}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              {customProfileCard.description as string}
            </Typography>
            
            {selectedProfileCard === customProfileCard.name && (
              <CheckCircle 
                sx={{ 
                  color: (customProfileCard.color as string), 
                  mt: 1,
                  fontSize: 20 
                }} 
              />
            )}
          </CardContent>
        </Card>
      );
    };

    const renderDefaultCards = () => {
      return DEFAULT_RCARDS.map((profileCard: ProfileCard) => (
        <Card
          key={profileCard.name}
          onClick={() => onProfileCardSelect(profileCard.name)}
          sx={{
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            border: 2,
            borderColor: selectedProfileCard === profileCard.name ? profileCard.color : 'divider',
            backgroundColor: selectedProfileCard === profileCard.name 
              ? alpha(profileCard.color || theme.palette.primary.main, 0.08)
              : 'background.paper',
            '&:hover': {
              borderColor: profileCard.color,
              transform: 'translateY(-2px)',
              boxShadow: theme.shadows[4],
            },
          }}
        >
          <CardContent sx={{ p: 3, textAlign: 'center', position: 'relative' }}>
            <IconButton
              size="small"
              onClick={(e) => onEditProfileCard(profileCard.name, e)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'grey.100',
                  transform: 'scale(1.1)',
                },
                transition: 'all 0.2s ease-in-out',
              }}
            >
              <Settings sx={{ fontSize: 16 }} />
            </IconButton>

            <Avatar
              sx={{
                bgcolor: profileCard.color || theme.palette.primary.main,
                width: 48,
                height: 48,
                mx: 'auto',
                mb: 2,
                '& .MuiSvgIcon-root': { fontSize: 28 }
              }}
            >
              {getProfileCardIcon(profileCard.icon || 'PersonOutline')}
            </Avatar>
            
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {profileCard.name}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
              {profileCard.description}
            </Typography>
            
            {selectedProfileCard === profileCard.name && (
              <CheckCircle 
                sx={{ 
                  color: profileCard.color, 
                  mt: 1,
                  fontSize: 20 
                }} 
              />
            )}
          </CardContent>
        </Card>
      ));
    };

    return (
      <Box ref={ref}>
        {/* Profile Card Selection */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <CheckCircle color="primary" />
            Select Your Profile Card
          </Typography>
          
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: customProfileCard 
              ? { xs: '1fr', sm: '1fr', md: '1fr' }
              : { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, 
            gap: 2, 
            mt: 3,
            maxWidth: customProfileCard ? '400px' : '1000px',
            mx: 'auto',
            justifyItems: customProfileCard ? 'center' : 'stretch'
          }}>
            {customProfileCard ? renderCustomCard() : renderDefaultCards()}
          </Box>
        </Box>

        {/* Action Button */}
        <Button
          variant="contained"
          size="large"
          onClick={onJoinGroup}
          disabled={!selectedProfileCard}
          sx={{ 
            px: 4, 
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontSize: '1.1rem',
            minWidth: 200
          }}
        >
          Join Group
        </Button>
      </Box>
    );
  }
);

JoinProcess.displayName = 'JoinProcess';