import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
} from '@mui/material';
import {
  Groups,
  AutoAwesome,
  CloudSync,
  Email,
  Phone,
  LinkedIn,
  Storage,
} from '@mui/icons-material';

export const WelcomeToVaultPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if user was invited to a group
  const invitedToGroup = searchParams.get('group');
  const groupName = searchParams.get('groupName') || 'Tech Professionals';

  const handleConnectAccounts = () => {
    navigate('/import');
  };

  const handleJoinGroup = () => {
    navigate(`/join-group?group=${invitedToGroup}`);
  };

  const handleTryAI = () => {
    navigate('/');
  };

  return (
    <Box sx={{ 
      height: '100%',
      width: '100%',
      maxWidth: { xs: '100vw', md: '100%' },
      overflow: 'hidden',
      boxSizing: 'border-box',
      p: { xs: '10px', md: 0 },
      mx: { xs: 0, md: 'auto' }
    }}>
      <Box sx={{ 
        mb: { xs: 1, md: 1 },
        width: '100%',
        overflow: 'hidden',
        minWidth: 0
      }}>
        {/* Welcome Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Storage sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary'
            }}
          >
            Welcome to your personal data vault
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Your secure, private space in the NAO network is ready. Choose how you'd like to get started.
          </Typography>
        </Box>

        {/* Options */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
          
          {/* Connect Your Accounts */}
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '2px solid',
              borderColor: 'grey.200',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: 2,
              }
            }}
            onClick={handleConnectAccounts}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudSync sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Connect your accounts
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Import your existing connections to seed your network and get started faster
                  </Typography>
                </Box>
              </Box>

              {/* Import Options Preview */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, ml: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LinkedIn sx={{ fontSize: 16, color: '#0077B5' }} />
                  <Typography variant="caption" color="text.secondary">
                    LinkedIn
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Email sx={{ fontSize: 16, color: '#EA4335' }} />
                  <Typography variant="caption" color="text.secondary">
                    Gmail
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Phone sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography variant="caption" color="text.secondary">
                    Phone Contacts
                  </Typography>
                </Box>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 2 }}>
                Benefits: Quick network setup • Find existing connections • Get recommendations
              </Typography>

              <Button
                variant="outlined"
                fullWidth
                sx={{
                  mt: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                Connect Accounts
              </Button>
            </CardContent>
          </Card>

          {/* Conditional Join Group Option */}
          {invitedToGroup && (
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'all 0.2s',
                border: '2px solid',
                borderColor: 'grey.200',
                '&:hover': {
                  borderColor: 'success.main',
                  boxShadow: 2,
                }
              }}
              onClick={handleJoinGroup}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Groups sx={{ fontSize: 32, color: 'success.main', mr: 2 }} />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Join {groupName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You've been invited to join this group along with your NAO invitation
                    </Typography>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  fullWidth
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: 'success.main',
                    color: 'success.main',
                    '&:hover': {
                      backgroundColor: 'success.50',
                      borderColor: 'success.main',
                    }
                  }}
                >
                  Join Group
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Try the NAO AI */}
          <Card 
            sx={{ 
              cursor: 'pointer',
              transition: 'all 0.2s',
              border: '2px solid',
              borderColor: 'grey.200',
              '&:hover': {
                borderColor: 'secondary.main',
                boxShadow: 2,
              }
            }}
            onClick={handleTryAI}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AutoAwesome sx={{ fontSize: 32, color: 'secondary.main', mr: 2 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Try the NAO AI
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Discover how AI can help you find connections and opportunities in your network
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  backgroundColor: 'secondary.main',
                  '&:hover': {
                    backgroundColor: 'secondary.dark',
                  }
                }}
              >
                Explore NAO AI
              </Button>
            </CardContent>
          </Card>
        </Box>

      </Box>
    </Box>
  );
};