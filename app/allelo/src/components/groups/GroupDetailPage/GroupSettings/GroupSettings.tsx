import { forwardRef } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Button,
  Alert
} from '@mui/material';
import {
  UilSetting as Settings,
  UilShield as Security,
  UilBell as Notifications
} from '@iconscout/react-unicons';
import type { Group } from '@/types/group';
import type { GroupSettingsProps } from './types';

export const GroupSettings = forwardRef<HTMLDivElement, GroupSettingsProps>(
  ({ group, onUpdateGroup, isLoading = false }, ref) => {
    if (isLoading || !group) {
      return (
        <Box ref={ref} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {isLoading ? 'Loading settings...' : 'Group not found'}
          </Typography>
        </Box>
      );
    }

    return (
      <Box ref={ref} sx={{ mt: 2, maxWidth: 600 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Settings /> Group Settings
        </Typography>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Basic Information
            </Typography>
            
            <TextField
              fullWidth
              label="Group Name"
              value={group.name}
              onChange={(e) => onUpdateGroup({ name: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              value={group.description || ''}
              onChange={(e) => onUpdateGroup({ description: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Category"
              value={(group as { category?: string }).category || ''}
              onChange={(e) => onUpdateGroup({ category: e.target.value } as Partial<Group>)}
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Security /> Privacy & Security
            </Typography>
            
            <FormControlLabel
              control={
                <Switch
                  checked={group.isPrivate || false}
                  onChange={(e) => onUpdateGroup({ isPrivate: e.target.checked })}
                />
              }
              label="Private Group"
              sx={{ mb: 1 }}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Private groups require approval to join and are not visible in search results.
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Require approval for new members"
              sx={{ mb: 1 }}
            />
            
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Allow members to invite others"
            />
          </CardContent>
        </Card>

        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Notifications /> Notifications
            </Typography>
            
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Email notifications for new messages"
              sx={{ mb: 1 }}
            />
            
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Push notifications for mentions"
              sx={{ mb: 1 }}
            />
            
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Weekly digest emails"
            />
          </CardContent>
        </Card>

        <Alert severity="info" sx={{ mb: 3 }}>
          Changes are saved automatically. Some settings may take a few minutes to take effect.
        </Alert>

        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="error">
            Leave Group
          </Button>
          
          <Button variant="outlined" color="warning">
            Archive Group
          </Button>
        </Box>
      </Box>
    );
  }
);

GroupSettings.displayName = 'GroupSettings';