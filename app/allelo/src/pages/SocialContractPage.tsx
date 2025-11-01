import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  alpha,
  useTheme
} from '@mui/material';
import {
  UilShield,
  UilHeart,
  UilBrain,
  UilSitemap,
  UilChartLine,
  UilInfoCircle,
  UilTimes,
  UilCheckCircle
} from '@iconscout/react-unicons';
import { dataService } from '@/services/dataService';
import type { Group } from '@/types/group';

const SocialContractPage = () => {
  const [group, setGroup] = useState<Group | null>(null);
  const [isGroupInvite, setIsGroupInvite] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [inviteData, setInviteData] = useState<{
    inviteeName?: string;
    inviterName?: string;
    relationshipType?: string;
  }>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const theme = useTheme();

  useEffect(() => {
    const loadGroupData = async () => {
      const groupId = searchParams.get('groupId');
      const inviteId = searchParams.get('invite');
      const existingMember = searchParams.get('existingMember') === 'true';
      
      // Debug logging
      console.log('SocialContract - URL Parameters:', {
        groupId,
        inviteId,
        existingMember,
        allParams: Object.fromEntries(searchParams.entries())
      });
      
      // If this is for an existing member and it's a group invite, redirect to group join page
      if (existingMember && groupId) {
        console.log('Redirecting existing member to GroupJoinPage');
        const joinParams = new URLSearchParams(searchParams);
        navigate(`/join-group?${joinParams.toString()}`);
        return;
      }
      
      // Extract invite personalization data
      const inviteeName = searchParams.get('inviteeName');
      const inviterName = searchParams.get('inviterName') || (inviteId ? 'Oli S-B' : undefined);
      const relationshipType = searchParams.get('relationshipType');
      
      setInviteData({
        inviteeName: inviteeName || undefined,
        inviterName,
        relationshipType: relationshipType || undefined,
      });
      
      if (groupId) {
        setIsGroupInvite(true);
        try {
          const groupData = await dataService.getGroup(groupId);
          setGroup(groupData || null);
        } catch (error) {
          console.error('Failed to load group:', error);
        }
      }
      
      // Store invite parameters for later use
      if (inviteId) {
        sessionStorage.setItem('inviteId', inviteId);
      }
      if (groupId) {
        sessionStorage.setItem('groupId', groupId);
      }
    };

    loadGroupData();
  }, [searchParams, navigate]);

  const handleAccept = () => {
    // Store acceptance in session
    sessionStorage.setItem('socialContractAccepted', 'true');
    
    // Navigate directly to the appropriate page
    if (isGroupInvite && group) {
      const params = new URLSearchParams({
        newMember: 'true',
        fromInvite: 'true',
        ...(inviteData.inviteeName && { firstName: inviteData.inviteeName })
      });
      navigate(`/groups/${group.id}?${params.toString()}`);
    } else {
      navigate('/contacts');
    }
  };

  const handleDontLike = () => {
    // Show the "Tell Me More" dialog instead of rejecting
    setShowMoreInfo(true);
  };

  const handleTellMeMore = () => {
    setShowMoreInfo(true);
  };

  const socialContractPrinciples = [
    {
      icon: <UilBrain size="24" />,
      title: 'Be Your Authentic Self',
      description: 'Share your genuine thoughts, experiences, and perspectives. Authenticity builds trust and meaningful connections.'
    },
    {
      icon: <UilHeart size="24" />,
      title: 'Act with Respect & Kindness',
      description: 'Treat all members with dignity and respect. Disagreements are welcome, but personal attacks are not.'
    },
    {
      icon: <UilShield size="24" />,
      title: 'Maintain Confidentiality',
      description: 'What is shared here, stays here. Respect the privacy of discussions and personal information shared by others.'
    },
    {
      icon: <UilChartLine size="24" />,
      title: 'Contribute Meaningfully',
      description: 'Share valuable insights, ask thoughtful questions, and help others grow. Quality over quantity.'
    },
    {
      icon: <UilSitemap size="24" />,
      title: 'Build Genuine Relationships',
      description: 'Focus on creating real connections, not just expanding your network numbers. Relationships take time and effort.'
    }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: 1,
          borderColor: 'divider'
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ whiteSpace: 'pre-line' }}>
            {inviteData.inviteeName && inviteData.inviterName && group
              ? `Welcome ${inviteData.inviteeName},\n${inviteData.inviterName} is inviting you to the ${group.name} Group,\npart of the NAO Network`
              : inviteData.inviterName && group
                ? `Welcome,\n${inviteData.inviterName} is inviting you to the ${group.name} Group,\npart of the NAO Network`
                : group
                  ? `Welcome to the ${group.name} Group`
                  : 'Welcome to NAO'
            }
          </Typography>
          
          <Typography variant="h5" color="primary" gutterBottom>
            You're entering a high-trust environment
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mx: 'auto' }}>
            NAO is built on trust, authenticity, and meaningful connections. Before you join{isGroupInvite && group ? ` ${group.name}` : ''}, please read and agree to our social contract.
          </Typography>
        </Box>

        {/* Core Principles */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <UilCheckCircle size="24" color="inherit" />
            Our Core Principles
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mt: 3 }}>
            {socialContractPrinciples.slice(0, 4).map((principle, index) => (
              <Box 
                key={index}
                sx={{ 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: 2, 
                  p: 2, 
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  border: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.12)
                }}
              >
                <Box sx={{ color: 'primary.main', mt: 0.5 }}>
                  {principle.icon}
                </Box>
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {principle.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {principle.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Call to Action */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Ready to join our community?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            By agreeing, you commit to upholding these principles and creating a positive environment for everyone.
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleAccept}
            sx={{ 
              px: 4, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '1.1rem'
            }}
          >
            I Agree - Let's Connect!
          </Button>
          
          <Button
            variant="outlined"
            size="large"
            startIcon={<UilInfoCircle size="20" />}
            onClick={handleTellMeMore}
            sx={{ 
              px: 3, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none'
            }}
          >
            Tell Me More
          </Button>
          
          <Button
            variant="text"
            size="large"
            startIcon={<UilTimes size="20" />}
            onClick={handleDontLike}
            sx={{ 
              px: 3, 
              py: 1.5,
              borderRadius: 2,
              textTransform: 'none',
              color: 'text.secondary'
            }}
          >
            I Don't Like the Sound of That
          </Button>
        </Box>
      </Paper>

      {/* More Info Dialog */}
      <Dialog 
        open={showMoreInfo} 
        onClose={() => setShowMoreInfo(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div">
            About Our High-Trust Environment
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            NAO is more than just a networking platform - it's a community where professionals can be their authentic selves and build genuine relationships.
          </Typography>
          
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            What makes us different:
          </Typography>
          
          <List>
            {socialContractPrinciples.map((principle, index) => (
              <ListItem key={index} sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ color: 'primary.main', mt: 0.5 }}>
                  {principle.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={principle.title}
                  secondary={principle.description}
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 3 }} />
          
          <Typography variant="h6" gutterBottom>
            Why this matters:
          </Typography>
          
          <Typography variant="body1" paragraph>
            In a world of superficial connections and promotional content, we're creating something different. 
            A space where vulnerability is valued, where you can ask for help without judgment, and where 
            success is measured by the quality of relationships, not just the quantity of connections.
          </Typography>
          
          <Typography variant="body1" paragraph>
            When you join, you're not just adding another network to your list - you're becoming part of 
            a community that will support your professional growth and personal development.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMoreInfo(false)} variant="outlined">
            Close
          </Button>
          <Button onClick={() => { setShowMoreInfo(false); handleAccept(); }} variant="contained">
            I'm Ready to Join
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SocialContractPage;