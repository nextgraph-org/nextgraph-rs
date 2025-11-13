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
import type { Vouch, Praise } from '@/types/notification';
import {RCard} from "@/.ldo/rcard.typings.ts";

interface ReceivedVouch extends Vouch {
  status: 'accepted' | 'rejected';
  assignedToCards?: RCard["type"][];
}

interface ReceivedPraise extends Praise {
  status: 'accepted' | 'rejected';
  assignedToCards?: RCard["type"][];
}

interface VouchesSectionProps {
  cardName: string;
}

export const VouchesSection = ({ cardName }: VouchesSectionProps) => {
  const theme = useTheme();
  const [editingVouch, setEditingVouch] = useState<(ReceivedVouch | ReceivedPraise) | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCards, setSelectedCards] = useState<RCard["type"][]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'accepted' | 'rejected'>('accepted');

  // Mock vouch and praise data - filtered for this specific card
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

  // Filter vouches and praises for this specific card
  const filteredVouches = receivedVouches.filter(vouch => 
    vouch.status === 'accepted' && vouch.assignedToCards?.includes(cardName as RCard["type"])
  );
  
  const filteredPraises = receivedPraises.filter(praise => 
    praise.status === 'accepted' && praise.assignedToCards?.includes(cardName as RCard["type"])
  );

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
    setSelectedCards(typeof value === 'string' ? value.split(',') as RCard["type"][] : value as RCard["type"][]);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Vouches for {cardName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Praises and vouches assigned to this profile card
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Received Vouches for this card */}
          {filteredVouches.map((vouch) => (
            <Box key={vouch.id}>
              <Box sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                bgcolor: alpha(theme.palette.success.main, 0.04),
                borderRadius: 2,
                border: 1,
                borderColor: alpha(theme.palette.success.main, 0.2),
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
                      <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
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
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}

          {/* Received Praises for this card */}
          {filteredPraises.map((praise) => (
            <Box key={praise.id}>
              <Box sx={{
                display: 'flex',
                gap: 2,
                p: 2,
                bgcolor: alpha(theme.palette.success.main, 0.04),
                borderRadius: 2,
                border: 1,
                borderColor: alpha(theme.palette.success.main, 0.2),
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
                      <CheckCircle sx={{ color: 'success.main', fontSize: 18 }} />
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
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}

          {/* Empty state */}
          {filteredVouches.length === 0 && filteredPraises.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No vouches or praises assigned to this profile card yet.
              </Typography>
            </Box>
          )}
        </Box>
      </CardContent>

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
                      <Select<RCard["type"][]>
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
                        {(['Friends', 'Family', 'Community', 'Business'] as RCard["type"][]).map((card) => (
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
    </Card>
  );
};