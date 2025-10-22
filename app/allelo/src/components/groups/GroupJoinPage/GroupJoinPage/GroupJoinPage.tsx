import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Avatar,
  Chip,
  IconButton,
  alpha,
  useTheme
} from '@mui/material';
import {
  ArrowBack,
} from '@mui/icons-material';
import { dataService } from '@/services/dataService';
import type { Group } from '@/types/group';
import { JoinProcess } from '../JoinProcess';

export const GroupJoinPage = () => {
  const [group, setGroup] = useState<Group | null>(null);
  const [selectedProfileCard, setSelectedProfileCard] = useState<string>('');
  const [inviterName, setInviterName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [customProfileCard, setCustomProfileCard] = useState<{ id: string; name: string; [key: string]: unknown; } | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();

  useEffect(() => {
    const loadGroupData = async () => {
      const groupId = searchParams.get('groupId');
      const inviter = searchParams.get('inviterName') || 'Someone';
      const customProfileCardParam = searchParams.get('customProfileCard');
      
      console.log('GroupJoinPage - URL Parameters:', {
        groupId,
        inviter,
        customProfileCardParam,
        allParams: Object.fromEntries(searchParams.entries())
      });
      
      setInviterName(inviter);
      
      if (customProfileCardParam) {
        try {
          const customCard = JSON.parse(decodeURIComponent(customProfileCardParam));
          setCustomProfileCard(customCard);
          setSelectedProfileCard(customCard.name);
        } catch (error) {
          console.error('Failed to parse custom profile card:', error);
        }
      }
      
      if (groupId) {
        try {
          const groupData = await dataService.getGroup(groupId);
          setGroup(groupData || null);
        } catch (error) {
          console.error('Failed to load group:', error);
        }
      }
      
      setIsLoading(false);
    };

    loadGroupData();
  }, [searchParams]);

  const handleProfileCardSelect = (profileCardName: string) => {
    setSelectedProfileCard(profileCardName);
  };

  const handleEditProfileCard = (profileCardName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const returnToUrl = new URLSearchParams(window.location.search);
    returnToUrl.set('selectedCard', profileCardName);
    
    navigate(`/account?tab=1&editCard=${profileCardName.toLowerCase().replace(/\s+/g, '-')}&returnTo=${encodeURIComponent(window.location.pathname + '?' + returnToUrl.toString())}`);
  };

  const handleJoinGroup = () => {
    if (selectedProfileCard) {
      console.log('Joining group with profile card:', selectedProfileCard);
      navigate(`/groups/${searchParams.get('groupId')}`, {
        state: { 
          joinedGroup: group?.name,
          profileCard: selectedProfileCard 
        }
      });
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!group) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            Group not found
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 4 }, textAlign: 'center', border: 1, borderColor: 'divider' }}>
        {/* Back Button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
        </Box>

        {/* Group Info */}
        <Box sx={{ mb: 4 }}>
          <Avatar
            src={group.image}
            sx={{
              width: 80,
              height: 80,
              mx: 'auto',
              mb: 2,
              bgcolor: 'primary.main',
              fontSize: '2rem',
              fontWeight: 600
            }}
          >
            {!group.image && group.name.slice(0, 2).toUpperCase()}
          </Avatar>
          
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
            {group.name}
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: '500px', mx: 'auto' }}>
            {group.description}
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
            <Chip 
              label={`${group.memberCount || 0} members`} 
              variant="outlined" 
              size="small"
              sx={{ 
                borderColor: alpha(theme.palette.primary.main, 0.3),
                color: 'primary.main'
              }}
            />
            {group.isPrivate && (
              <Chip label="Private Group" size="small" variant="outlined" />
            )}
          </Box>
          
          <Typography variant="h6" color="primary" gutterBottom>
            Choose your profile card
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            {inviterName} has invited you to join this group. 
            Select how you'd like to connect with this group. This determines what personal information will be visible to group members.
          </Typography>
        </Box>

        {/* Join Process */}
        <JoinProcess
          selectedProfileCard={selectedProfileCard}
          customProfileCard={customProfileCard}
          onProfileCardSelect={handleProfileCardSelect}
          onEditProfileCard={handleEditProfileCard}
          onJoinGroup={handleJoinGroup}
        />
      </Paper>
    </Container>
  );
};