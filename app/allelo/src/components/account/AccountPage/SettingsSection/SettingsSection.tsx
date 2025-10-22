import { forwardRef } from 'react';
import {
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Avatar,
  IconButton,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Business,
  PersonOutline,
  Groups,
  FamilyRestroom,
  Favorite,
  Home,
  LocationOn,
  Public, Edit,
} from '@mui/icons-material';
import RCardPrivacySettings from '@/components/account/RCardPrivacySettings';
import type { SettingsSectionProps } from '../types';

export const SettingsSection = forwardRef<HTMLDivElement, SettingsSectionProps>(
  ({ rCards, selectedRCard, onRCardSelect, onCreateRCard, onEditRCard, onUpdate }, ref) => {
    const theme = useTheme();

    const getRCardIcon = (iconName: string) => {
      switch (iconName) {
        case 'Business':
          return <Business />;
        case 'PersonOutline':
          return <PersonOutline />;
        case 'Groups':
          return <Groups />;
        case 'FamilyRestroom':
          return <FamilyRestroom />;
        case 'Favorite':
          return <Favorite />;
        case 'Home':
          return <Home />;
        case 'LocationOn':
          return <LocationOn />;
        case 'Public':
          return <Public />;
        default:
          return <PersonOutline />;
      }
    };

    return (
      <Box ref={ref}>
        <Grid container spacing={3}>
          {/* rCard List */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Profile Cards
                  </Typography>
                  <IconButton size="small" color="primary" onClick={onCreateRCard}>
                    <Add />
                  </IconButton>
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Control what information you share with different types of connections
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {rCards.map((rCard) => (
                    <Card
                      key={rCard.id}
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        border: selectedRCard?.id === rCard.id ? 2 : 1,
                        borderColor: selectedRCard?.id === rCard.id ? 'primary.main' : 'divider',
                        backgroundColor: selectedRCard?.id === rCard.id 
                          ? alpha(theme.palette.primary.main, 0.04) 
                          : 'transparent',
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.action.hover, 0.5),
                        },
                      }}
                      onClick={() => onRCardSelect(rCard)}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar
                            sx={{ 
                              bgcolor: rCard.color || 'primary.main',
                              width: 40,
                              height: 40
                            }}
                          >
                            {getRCardIcon(rCard.icon || 'PersonOutline')}
                          </Avatar>
                          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {rCard.name}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ 
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {rCard.description}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditRCard(rCard);
                              }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Privacy Settings */}
          <Grid size={{ xs: 12, md: 8 }}>
            {selectedRCard ? (
              <RCardPrivacySettings
                rCard={selectedRCard}
                onUpdate={onUpdate}
              />
            ) : (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    Select a Profile Card
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Choose a profile card from the list to view and edit its privacy settings
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>
        </Grid>
      </Box>
    );
  }
);

SettingsSection.displayName = 'SettingsSection';