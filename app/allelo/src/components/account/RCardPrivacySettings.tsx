import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Divider,
} from '@mui/material';
import {
  UilShield as Security,
  UilLocationPoint as LocationOn,
  UilShareAlt as Share,
  UilSync as Refresh,
  UilKeySkeletonAlt as VpnKey,
} from '@iconscout/react-unicons';
import type { RCardWithPrivacy, LocationSharingLevel } from '@/types/notification';
import { DEFAULT_PRIVACY_SETTINGS } from '@/types/notification';

interface RCardPrivacySettingsProps {
  rCard: RCardWithPrivacy;
  onUpdate: (updatedRCard: RCardWithPrivacy) => void;
}

const RCardPrivacySettings = ({ rCard, onUpdate }: RCardPrivacySettingsProps) => {
  const [settings, setSettings] = useState(rCard?.privacySettings || DEFAULT_PRIVACY_SETTINGS);

  // Sync settings when rCard changes
  useEffect(() => {
    setSettings(rCard?.privacySettings || DEFAULT_PRIVACY_SETTINGS);
  }, [rCard]);

  const handleSettingChange = (
    category: string,
    field: string,
    value: unknown
  ) => {
    const newSettings = { ...settings };
    
    if (category === 'dataSharing' && newSettings.dataSharing && field in newSettings.dataSharing) {
      newSettings.dataSharing = {
        ...newSettings.dataSharing,
        [field]: value
      };
    } else if (category === 'reSharing' && newSettings.reSharing && field in newSettings.reSharing) {
      newSettings.reSharing = {
        ...newSettings.reSharing,
        [field]: value
      };
    } else if (category === 'general') {
      // Handle root level properties
      if (field === 'keyRecoveryBuddy') {
        (newSettings as Record<string, unknown>)[field] = value;
      } else if (field === 'locationSharing' || field === 'locationDeletionHours') {
        (newSettings as Record<string, unknown>)[field] = value;
      }
    }
    
    setSettings(newSettings);
    
    const updatedRCard = {
      ...rCard,
      privacySettings: newSettings,
      updatedAt: new Date(),
    };
    
    onUpdate(updatedRCard);
  };


  return (
    <Card>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Security color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Privacy Settings for {rCard.name}
          </Typography>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          Configure what information is shared with contacts assigned to this profile.
        </Typography>

        {/* Key Recovery & Trust Settings */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKey fontSize="small" />
            Trust & Recovery
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.keyRecoveryBuddy}
                  onChange={(e) => handleSettingChange('general', 'keyRecoveryBuddy', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Key Recovery Buddy
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Allow contacts in this category to help recover your account
                  </Typography>
                </Box>
              }
            />
            
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Location Sharing */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn fontSize="small" />
            Location Sharing
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Location Sharing Level</InputLabel>
            <Select
              value={settings.locationSharing}
              label="Location Sharing Level"
              onChange={(e) => handleSettingChange('general', 'locationSharing', e.target.value as LocationSharingLevel)}
            >
              <MenuItem value="never">Never</MenuItem>
              <MenuItem value="limited">Limited (On Request)</MenuItem>
              <MenuItem value="always">Always</MenuItem>
            </Select>
          </FormControl>
          
          {settings.locationSharing !== 'never' && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Auto-delete location after: {settings.locationDeletionHours} hours
              </Typography>
              <Slider
                value={settings.locationDeletionHours}
                onChange={(_, value) => handleSettingChange('general', 'locationDeletionHours', value)}
                min={1}
                max={48}
                step={1}
                marks={[
                  { value: 1, label: '1h' },
                  { value: 8, label: '8h' },
                  { value: 24, label: '24h' },
                  { value: 48, label: '48h' },
                ]}
                sx={{ color: 'primary.main', mt: 2 }}
              />
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Data Sharing */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Share fontSize="small" />
            Data Sharing
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.dataSharing.posts}
                  onChange={(e) => handleSettingChange('dataSharing', 'posts', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Posts
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Share your posts and updates
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.dataSharing.offers}
                  onChange={(e) => handleSettingChange('dataSharing', 'offers', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Offers
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Share what you're offering
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.dataSharing.wants}
                  onChange={(e) => handleSettingChange('dataSharing', 'wants', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Wants
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Share what you're looking for
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.dataSharing.vouches}
                  onChange={(e) => handleSettingChange('dataSharing', 'vouches', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Vouches
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Share vouches you've received
                  </Typography>
                </Box>
              }
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={settings.dataSharing.praise}
                  onChange={(e) => handleSettingChange('dataSharing', 'praise', e.target.checked)}
                />
              }
              label={
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Praise
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Share praise you've received
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Re-sharing Settings */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Refresh fontSize="small" />
            Re-sharing
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Allow your shared content to be forwarded through your network
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.reSharing.enabled}
                onChange={(e) => handleSettingChange('reSharing', 'enabled', e.target.checked)}
              />
            }
            label="Enable re-sharing of aggregated data"
            sx={{ mb: 3 }}
          />
          
          {settings.reSharing.enabled && (
            <Box>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Maximum sharing hops: {settings.reSharing.maxHops === 6 ? '∞' : settings.reSharing.maxHops}
              </Typography>
              <Slider
                value={settings.reSharing.maxHops}
                onChange={(_, value) => handleSettingChange('reSharing', 'maxHops', value)}
                min={1}
                max={6}
                step={1}
                marks={[
                  { value: 1, label: '1' },
                  { value: 2, label: '2' },
                  { value: 3, label: '3' },
                  { value: 4, label: '4' },
                  { value: 5, label: '5' },
                  { value: 6, label: '∞' },
                ]}
                sx={{ color: 'primary.main' }}
              />
              <Typography variant="caption" color="text.secondary">
                {settings.reSharing.maxHops === 6 
                  ? 'Your data can be shared unlimited times through your network'
                  : `Your data can be shared up to ${settings.reSharing.maxHops} connections away from you`
                }
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default RCardPrivacySettings;