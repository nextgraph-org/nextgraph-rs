import { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  Chip,
  alpha,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  SelectChangeEvent,
} from '@mui/material';
import {
  VerifiedUser,
  Favorite,
  CheckCircle,
  Cancel,
  Edit,
} from '@mui/icons-material';
import type { PersonhoodCredentials } from '@/types/personhood';
import type { Vouch, Praise } from '@/types/notification';
import type { RCardType } from '@/types/rcard';

interface ReceivedVouch extends Vouch {
  status: 'accepted' | 'rejected';
  assignedToCards?: RCardType[];
}

interface ReceivedPraise extends Praise {
  status: 'accepted' | 'rejected';
  assignedToCards?: RCardType[];
}

interface PersonhoodCredentialsProps {
  credentials: PersonhoodCredentials;
  onRefreshCredentials?: () => void;
}

const PersonhoodCredentialsComponent = ({ 
  credentials
}: PersonhoodCredentialsProps) => {
  const theme = useTheme();
  const [editingVouch, setEditingVouch] = useState<(ReceivedVouch | ReceivedPraise) | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCards, setSelectedCards] = useState<RCardType[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'accepted' | 'rejected'>('accepted');

  // Mock vouch and praise data - in real app this would come from props/API
  const [receivedVouches, setReceivedVouches] = useState<ReceivedVouch[]>([
    {
      id: 'v1',
      fromUserId: 'user-456',
      fromUserName: 'Sarah Johnson',
      fromUserAvatar: '/api/placeholder/40/40',
      toUserId: 'current-user',
      skill: 'React Development',
      description: 'Exceptional React skills and clean code practices. Always delivers high-quality components.',
      level: 'expert',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      status: 'accepted',
      assignedToCards: ['Business', 'Community'],
    },
    {
      id: 'v2',
      fromUserId: 'user-789',
      fromUserName: 'Mike Chen',
      fromUserAvatar: '/api/placeholder/40/40',
      toUserId: 'current-user',
      skill: 'Leadership',
      description: 'Great leadership skills during challenging projects.',
      level: 'advanced',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14),
      status: 'accepted',
      assignedToCards: ['Family'],
    },
  ]);

  const [receivedPraises, setReceivedPraises] = useState<ReceivedPraise[]>([
    {
      id: 'p1',
      fromUserId: 'user-321',
      fromUserName: 'Emma Davis',
      fromUserAvatar: '/api/placeholder/40/40',
      toUserId: 'current-user',
      category: 'communication',
      title: 'Excellent Communication',
      description: 'Always clear and helpful in discussions. Makes complex topics easy to understand.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      status: 'accepted',
      assignedToCards: ['Friends', 'Business'],
    },
    {
      id: 'p2',
      fromUserId: 'user-123',
      fromUserName: 'John Smith',
      fromUserAvatar: '/api/placeholder/40/40',
      toUserId: 'current-user',
      category: 'teamwork',
      title: 'Great Team Player',
      description: 'Fantastic collaboration skills and always willing to help others.',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21),
      status: 'rejected',
      assignedToCards: undefined,
    },
  ]);


  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  const getTopicTag = (vouch: ReceivedVouch | ReceivedPraise) => {
    if ('skill' in vouch) {
      // For vouches, extract the main topic from skill
      const skill = vouch.skill.toLowerCase();
      if (skill.includes('react')) return 'React';
      if (skill.includes('leadership')) return 'Leadership';
      if (skill.includes('typescript')) return 'TypeScript';
      if (skill.includes('javascript')) return 'JavaScript';
      if (skill.includes('python')) return 'Python';
      if (skill.includes('design')) return 'Design';
      if (skill.includes('management')) return 'Management';
      return vouch.skill; // fallback to full skill name
    } else {
      // For praises, use the category
      return vouch.category.charAt(0).toUpperCase() + vouch.category.slice(1);
    }
  };

  const handleEditVouch = (vouch: ReceivedVouch | ReceivedPraise) => {
    setEditingVouch(vouch);
    setSelectedCards(vouch.assignedToCards || []);
    setSelectedStatus(vouch.status);
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editingVouch) {
      // In a real app, this would update the backend
      const updatedVouch = { 
        ...editingVouch, 
        status: selectedStatus,
        assignedToCards: selectedStatus === 'accepted' ? selectedCards : undefined 
      };
      
      // Update local state
      if ('skill' in editingVouch) {
        // Update vouch
        setReceivedVouches(prev => 
          prev.map(v => v.id === editingVouch.id 
            ? { ...v, status: selectedStatus, assignedToCards: selectedStatus === 'accepted' ? selectedCards : undefined } 
            : v
          )
        );
      } else {
        // Update praise
        setReceivedPraises(prev => 
          prev.map(p => p.id === editingVouch.id 
            ? { ...p, status: selectedStatus, assignedToCards: selectedStatus === 'accepted' ? selectedCards : undefined } 
            : p
          )
        );
      }
      
      console.log('Updated vouch/praise status and rCard assignments:', updatedVouch);
    }
    setShowEditDialog(false);
    setEditingVouch(null);
    setSelectedCards([]);
    setSelectedStatus('accepted');
  };

  const handleCardSelectionChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setSelectedCards(typeof value === 'string' ? value.split(',') as RCardType[] : value as RCardType[]);
  };


  return (
    <Box>
      {/* Verifications Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <VerifiedUser color="primary" sx={{ fontSize: 28 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Personhood Credentials
              </Typography>
              <Typography variant="body2" color="text.secondary">
                People that have verified your personhood through real world connections
              </Typography>
            </Box>
          </Box>
          
          {credentials.verifications.slice(0, 3).map((verification) => (
            <Box key={verification.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <Avatar src={verification.verifierAvatar} sx={{ width: 40, height: 40 }}>
                {verification.verifierName.charAt(0)}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {verification.verifierName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {verification.verifierJobTitle && (
                    <Typography variant="caption" color="text.secondary">
                      {verification.verifierJobTitle}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    • {formatRelativeTime(verification.verifiedAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}

          {credentials.verifications.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No verifications yet. Share your QR code with trusted contacts to start building your personhood credentials.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Vouches Section */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Vouches
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Praises and vouches received from my connections
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Received Vouches */}
            {receivedVouches.map((vouch) => (
              <Box key={vouch.id}>
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  bgcolor: vouch.status === 'accepted' 
                    ? alpha(theme.palette.success.main, 0.04)
                    : alpha(theme.palette.error.main, 0.04),
                  borderRadius: 2,
                  border: 1,
                  borderColor: vouch.status === 'accepted'
                    ? alpha(theme.palette.success.main, 0.2)
                    : alpha(theme.palette.error.main, 0.2),
                }}>
                  <Avatar src={vouch.fromUserAvatar} sx={{ width: 40, height: 40 }}>
                    {vouch.fromUserName.charAt(0)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <VerifiedUser sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {vouch.skill}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        • {formatRelativeTime(vouch.createdAt)}
                      </Typography>
                      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                        {vouch.status === 'accepted' && <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />}
                        {vouch.status === 'rejected' && <Cancel sx={{ color: 'error.main', fontSize: 18 }} />}
                        <IconButton size="small" onClick={() => handleEditVouch(vouch)}>
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          "{vouch.description}" - <strong>{vouch.fromUserName}</strong>
                        </Typography>
                        <Chip 
                          label={getTopicTag(vouch)} 
                          size="small" 
                          variant="outlined"
                          color="primary"
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
                        <Chip 
                          label={vouch.status.charAt(0).toUpperCase() + vouch.status.slice(1)}
                          size="small"
                          color={vouch.status === 'accepted' ? 'success' : 'error'}
                        />
                        {vouch.assignedToCards && vouch.assignedToCards.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">
                              Shows on:
                            </Typography>
                            {vouch.assignedToCards.map((card: string) => (
                              <Chip 
                                key={card}
                                label={card}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}

            {/* Received Praises */}
            {receivedPraises.map((praise) => (
              <Box key={praise.id}>
                <Box sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  bgcolor: praise.status === 'accepted' 
                    ? alpha(theme.palette.success.main, 0.04)
                    : alpha(theme.palette.error.main, 0.04),
                  borderRadius: 2,
                  border: 1,
                  borderColor: praise.status === 'accepted'
                    ? alpha(theme.palette.success.main, 0.2)
                    : alpha(theme.palette.error.main, 0.2),
                }}>
                  <Avatar src={praise.fromUserAvatar} sx={{ width: 40, height: 40 }}>
                    {praise.fromUserName.charAt(0)}
                  </Avatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Favorite sx={{ color: '#d81b60', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {praise.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        • {formatRelativeTime(praise.createdAt)}
                      </Typography>
                      <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                        {praise.status === 'accepted' && <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />}
                        {praise.status === 'rejected' && <Cancel sx={{ color: 'error.main', fontSize: 18 }} />}
                        <IconButton size="small" onClick={() => handleEditVouch(praise)}>
                          <Edit sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          "{praise.description}" - <strong>{praise.fromUserName}</strong>
                        </Typography>
                        <Chip 
                          label={getTopicTag(praise)} 
                          size="small" 
                          variant="outlined"
                          sx={{ color: '#d81b60', borderColor: '#d81b60' }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end', flexShrink: 0 }}>
                        <Chip 
                          label={praise.status.charAt(0).toUpperCase() + praise.status.slice(1)}
                          size="small"
                          color={praise.status === 'accepted' ? 'success' : 'error'}
                        />
                        {praise.assignedToCards && praise.assignedToCards.length > 0 && (
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <Typography variant="caption" color="text.secondary">
                              Shows on:
                            </Typography>
                            {praise.assignedToCards.map((card: string) => (
                              <Chip 
                                key={card}
                                label={card}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}

            {/* Empty state */}
            {receivedVouches.length === 0 && receivedPraises.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No vouches or praises yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vouches and praises from your connections will appear here
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onClose={() => setShowEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit {'skill' in (editingVouch || {}) ? 'Vouch' : 'Praise'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {editingVouch && (
              <>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                  {'skill' in editingVouch ? editingVouch.skill : editingVouch.title}
                </Typography>
                
                {/* Status Selection */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={selectedStatus}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'accepted' | 'rejected';
                      setSelectedStatus(newStatus);
                      // Clear cards when changing to rejected
                      if (newStatus === 'rejected') {
                        setSelectedCards([]);
                      }
                    }}
                    input={<OutlinedInput label="Status" />}
                  >
                    <MenuItem value="accepted">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                        Accepted
                      </Box>
                    </MenuItem>
                    <MenuItem value="rejected">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Cancel sx={{ color: 'error.main', fontSize: 20 }} />
                        Rejected
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                {/* rCard Assignment - only show if status is accepted */}
                {selectedStatus === 'accepted' && (
                  <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Select which rCards this {'skill' in editingVouch ? 'vouch' : 'praise'} should appear on:
                    </Typography>
                    
                    <FormControl fullWidth>
                      <InputLabel>rCards</InputLabel>
                      <Select<RCardType[]>
                        multiple
                        value={selectedCards}
                        onChange={handleCardSelectionChange}
                        input={<OutlinedInput label="rCards" />}
                        renderValue={(selected) => (
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {selected.map((value) => (
                              <Chip key={value} label={value} size="small" />
                            ))}
                          </Box>
                        )}
                      >
                        {(['Friends', 'Family', 'Community', 'Business'] as RCardType[]).map((card) => (
                          <MenuItem key={card} value={card}>
                            {card}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </>
                )}

                {selectedStatus === 'rejected' && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Rejected {'skill' in editingVouch ? 'vouches' : 'praises'} will not appear on any rCards.
                  </Typography>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEditDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default PersonhoodCredentialsComponent;