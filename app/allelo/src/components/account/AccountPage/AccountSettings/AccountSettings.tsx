import { forwardRef, useState } from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Divider,
} from '@mui/material';
import {
  SmartToy,
  Warning,
  DeleteForever,
} from '@mui/icons-material';
import PersonhoodCredentialsComponent from '@/components/account/PersonhoodCredentials';
import type { PersonhoodCredentials } from '@/types/personhood';

interface AccountSettingsProps {
  personhoodCredentials: PersonhoodCredentials;
}

export const AccountSettings = forwardRef<HTMLDivElement, AccountSettingsProps>(
  ({ personhoodCredentials }, ref) => {
    const [aiEnabled, setAiEnabled] = useState(true);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    const handleAiToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
      setAiEnabled(event.target.checked);
      console.log('AI functionality', event.target.checked ? 'enabled' : 'disabled');
    };

    const handleDeleteAccount = () => {
      setShowDeleteDialog(true);
    };

    const handleConfirmDelete = () => {
      if (deleteConfirmation.toLowerCase() === 'delete my account') {
        console.log('Account deletion confirmed');
        // In a real app, this would call an API to delete the account
        alert('Account deletion would be processed. This is a demo.');
        setShowDeleteDialog(false);
        setDeleteConfirmation('');
      }
    };

    const handleCancelDelete = () => {
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
    };

    return (
      <Box ref={ref}>
        {/* AI Settings */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <SmartToy color="primary" sx={{ fontSize: 28 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  AI Features
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Control AI-powered features and recommendations
                </Typography>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={aiEnabled}
                  onChange={handleAiToggle}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Enable AI Features
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Allow AI to help with content suggestions, connection recommendations, and smart features
                  </Typography>
                </Box>
              }
            />

            {!aiEnabled && (
              <Alert severity="info" sx={{ mt: 2 }}>
                AI features are disabled. You won't receive smart recommendations or AI-powered insights.
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Personhood Credentials */}
        {/*<Box sx={{ mb: 3 }}>*/}
        {/*  <PersonhoodCredentialsComponent*/}
        {/*    credentials={personhoodCredentials}*/}
        {/*  />*/}
        {/*</Box>*/}

        <Divider sx={{ my: 3 }} />

        {/* Danger Zone */}
        <Card sx={{ border: 1, borderColor: 'error.main' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Warning color="error" sx={{ fontSize: 28 }} />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'error.main' }}>
                  Danger Zone
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Irreversible and destructive actions
                </Typography>
              </Box>
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Account Deletion Warning
              </Typography>
              <Typography variant="body2">
                Deleting your account will permanently remove all your data, connections, posts, documents, 
                and profile information. This action cannot be undone.
              </Typography>
            </Alert>

            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForever />}
              onClick={handleDeleteAccount}
              sx={{
                borderColor: 'error.main',
                color: 'error.main',
                '&:hover': {
                  borderColor: 'error.dark',
                  backgroundColor: 'error.light',
                  color: 'error.dark',
                }
              }}
            >
              Delete My Account
            </Button>
          </CardContent>
        </Card>

        {/* Delete Account Dialog */}
        <Dialog
          open={showDeleteDialog}
          onClose={handleCancelDelete}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 3,
            }
          }}
        >
          <DialogTitle sx={{ color: 'error.main' }}>
            Delete Account
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                This action is permanent and cannot be undone!
              </Typography>
              <Typography variant="body2">
                All of your data will be permanently deleted, including:
              </Typography>
              <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                <li>Profile information and rCards</li>
                <li>All posts, documents, and social queries</li>
                <li>Connection network and vouches</li>
                <li>Privacy settings and preferences</li>
                <li>Personhood credentials and verifications</li>
              </Box>
            </Alert>

            <Typography variant="body2" sx={{ mb: 2 }}>
              To confirm account deletion, please type{' '}
              <Typography component="span" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                delete my account
              </Typography>
              {' '}in the field below:
            </Typography>

            <TextField
              fullWidth
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="delete my account"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: 'error.main',
                  },
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={handleCancelDelete} variant="outlined">
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDelete}
              variant="contained"
              color="error"
              disabled={deleteConfirmation.toLowerCase() !== 'delete my account'}
              startIcon={<DeleteForever />}
            >
              Delete Account
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
);

AccountSettings.displayName = 'AccountSettings';