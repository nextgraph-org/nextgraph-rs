import { forwardRef, useState } from 'react';
import { 
  Box, 
  Typography, 
  Avatar, 
  Card, 
  CardContent,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { UilThumbsUp as ThumbUp, UilPlus as Add, UilComment as Comment } from '@iconscout/react-unicons';
import type { GroupVouchesProps } from './types';
import {formatDateDiff} from "@/utils/dateHelpers";

export const GroupVouches = forwardRef<HTMLDivElement, GroupVouchesProps>(
  ({ vouches, onCreateVouch, isLoading = false }, ref) => {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newVouch, setNewVouch] = useState({
      receiver: '',
      message: '',
      type: 'vouch' as 'vouch' | 'praise',
      tags: [] as string[]
    });

    const handleCreateVouch = () => {
      if (!newVouch.receiver || !newVouch.message) return;
      
      onCreateVouch({
        giver: 'You',
        ...newVouch
      });
      
      setNewVouch({ receiver: '', message: '', type: 'vouch', tags: [] });
      setShowCreateDialog(false);
    };

    if (isLoading) {
      return (
        <Box ref={ref} sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Loading vouches...
          </Typography>
        </Box>
      );
    }

    return (
      <Box ref={ref}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ThumbUp size="20" /> Vouches & Praise
          </Typography>
          
          <Button
            variant="contained"
            startIcon={<Add size="20" />}
            onClick={() => setShowCreateDialog(true)}
            sx={{ borderRadius: 2 }}
          >
            Give Vouch
          </Button>
        </Box>

        {vouches.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 6 }}>
            <CardContent>
              <ThumbUp size="48" style={{ color: 'inherit', marginBottom: '16px' }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No vouches yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Be the first to give recognition to a group member!
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add size="20" />}
                onClick={() => setShowCreateDialog(true)}
              >
                Give First Vouch
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {vouches.map((vouch) => (
              <Card key={vouch.id} sx={{ '&:hover': { elevation: 2 } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Avatar
                        sx={{
                          width: 40,
                          height: 40,
                        }}
                      >
                        {vouch.giver.charAt(0).toUpperCase()}
                      </Avatar>
                      
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="subtitle2">
                            {vouch.giver}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">
                            {vouch.type === 'vouch' ? 'vouched for' : 'praised'}
                          </Typography>
                          
                          <Typography variant="subtitle2" color="primary">
                            {vouch.receiver}
                          </Typography>
                          
                          <Typography variant="caption" color="text.secondary">
                            • {formatDateDiff(vouch.timestamp, true)}
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {vouch.message}
                        </Typography>
                        
                        {vouch.tags && vouch.tags.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {vouch.tags.map((tag) => (
                              <Chip
                                key={tag}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                      
                      <Chip
                        icon={vouch.type === 'vouch' ? <ThumbUp size="16" /> : <Comment size="16" />}
                        label={vouch.type === 'vouch' ? 'Vouch' : 'Praise'}
                        size="small"
                        color={vouch.type === 'vouch' ? 'primary' : 'secondary'}
                        variant="outlined"
                      />
                    </Box>
                  </CardContent>
                </Card>
            ))}
          </Box>
        )}

        {/* Create Vouch Dialog */}
        <Dialog 
          open={showCreateDialog} 
          onClose={() => setShowCreateDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Give Recognition</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={newVouch.type}
                  onChange={(e) => setNewVouch(prev => ({ ...prev, type: e.target.value as 'vouch' | 'praise' }))}
                  label="Type"
                >
                  <MenuItem value="vouch">Vouch - Recommend someone's skills/character</MenuItem>
                  <MenuItem value="praise">Praise - Recognize someone's contribution</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="To"
                placeholder="Who are you recognizing?"
                value={newVouch.receiver}
                onChange={(e) => setNewVouch(prev => ({ ...prev, receiver: e.target.value }))}
              />
              
              <TextField
                fullWidth
                multiline
                rows={4}
                label={newVouch.type === 'vouch' ? 'Vouch Message' : 'Praise Message'}
                placeholder={newVouch.type === 'vouch' 
                  ? 'What would you like to vouch for about this person?' 
                  : 'What contribution would you like to recognize?'
                }
                value={newVouch.message}
                onChange={(e) => setNewVouch(prev => ({ ...prev, message: e.target.value }))}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateVouch}
              variant="contained"
              disabled={!newVouch.receiver || !newVouch.message}
            >
              {newVouch.type === 'vouch' ? 'Give Vouch' : 'Give Praise'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
);

GroupVouches.displayName = 'GroupVouches';