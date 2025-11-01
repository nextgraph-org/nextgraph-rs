import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Card,
  CardContent,
  Avatar,
  Chip,
  alpha,
  useTheme,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  UilUserPlus,
  UilWifi,
  UilShieldCheck,
  UilCheckCircle,
  UilInfoCircle,
  UilClock,
} from '@iconscout/react-unicons';

export const AcceptConnectionPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [connectionStatus, setConnectionStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [vouchStatus, setVouchStatus] = useState<'pending' | 'accepted' | 'rejected'>('pending');
  const [showVouchOnProfile, setShowVouchOnProfile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock inviter data - in real app, this would come from the invitation
  const inviter = {
    name: 'Sarah Johnson',
    avatar: '/api/placeholder/80/80',
    title: 'Product Manager at TechCorp',
    mutualConnections: 12,
  };

  // Mock user data - in real app, this would come from profile setup
  const userFirstName = 'John';

  const handleAcceptConnection = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnectionStatus('accepted');
    } catch (error) {
      console.error('Failed to accept connection:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectConnection = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setConnectionStatus('rejected');
    } catch (error) {
      console.error('Failed to reject connection:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptVouch = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVouchStatus('accepted');
    } catch (error) {
      console.error('Failed to accept vouch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectVouch = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setVouchStatus('rejected');
    } catch (error) {
      console.error('Failed to reject vouch:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    navigate('/onboarding/welcome');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          maxWidth: { xs: 480, md: 640 },
          p: { xs: 3, sm: 4, md: 5 },
          borderRadius: 3,
          backgroundColor: 'background.paper'
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary'
            }}
          >
            Accept your first network connection
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Accept connections and vouches from {inviter.name}
          </Typography>
        </Box>

        {/* P2P Connection Education */}
        <Card sx={{ mb: 4, backgroundColor: alpha(theme.palette.info.main, 0.04), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1) }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <UilWifi size="20" color="currentColor" style={{ color: 'var(--mui-palette-info-main)', marginRight: '8px' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                About P2P Connections
              </Typography>
            </Box>
            
            <Typography variant="caption" color="text.secondary">
              NAO connections are peer-to-peer with no server involvement. Your connection data is stored only in your personal vault and theirs, ensuring complete privacy and direct trust relationships.
            </Typography>
          </CardContent>
        </Card>

        {/* Connection Request - Notification Style */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Connection Request
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: 2, 
            py: 2,
            px: 2,
            backgroundColor: connectionStatus === 'pending' ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200',
            opacity: connectionStatus === 'rejected' ? 0.6 : 1
          }}>
            {/* Icon */}
            <Box sx={{ flexShrink: 0, mt: 0.5 }}>
              <UilUserPlus size="20" color="currentColor" style={{ color: 'var(--mui-palette-primary-main)' }} />
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {/* Sender Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar
                  src={inviter.avatar}
                  alt={inviter.name}
                  sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                >
                  {inviter.name?.charAt(0)}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {inviter.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • {inviter.title}
                </Typography>
              </Box>

              {/* Message */}
              <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
                {inviter.name} wants to connect with you on NAO
              </Typography>

              {/* Status and Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {connectionStatus !== 'pending' && (
                  <Chip
                    icon={connectionStatus === 'accepted' ? <UilCheckCircle size="16" /> : <UilClock size="16" />}
                    label={connectionStatus}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.75rem',
                      height: 20,
                      textTransform: 'capitalize',
                      ...(connectionStatus === 'accepted' && {
                        backgroundColor: alpha(theme.palette.success.main, 0.08),
                        borderColor: alpha(theme.palette.success.main, 0.2),
                        color: 'success.main'
                      }),
                      ...(connectionStatus === 'rejected' && {
                        backgroundColor: alpha(theme.palette.error.main, 0.08),
                        borderColor: alpha(theme.palette.error.main, 0.2),
                        color: 'error.main'
                      })
                    }}
                  />
                )}

                {/* Action Buttons */}
                {connectionStatus === 'pending' && (
                  <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                    <button
                      onClick={handleRejectConnection}
                      disabled={isProcessing}
                      style={{
                        minWidth: 60,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        border: '1px solid',
                        borderColor: theme.palette.grey[400],
                        borderRadius: 4,
                        backgroundColor: 'transparent',
                        color: theme.palette.text.primary,
                        cursor: isProcessing ? 'default' : 'pointer',
                        opacity: isProcessing ? 0.6 : 1
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleAcceptConnection}
                      disabled={isProcessing}
                      style={{
                        minWidth: 60,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        border: 'none',
                        borderRadius: 4,
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        cursor: isProcessing ? 'default' : 'pointer',
                        opacity: isProcessing ? 0.6 : 1
                      }}
                    >
                      Accept
                    </button>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Vouch Information */}
        <Box sx={{ mb: 3 }}>
          <Card sx={{ backgroundColor: alpha(theme.palette.info.main, 0.04), border: '1px solid', borderColor: alpha(theme.palette.info.main, 0.1), mb: 2 }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <UilInfoCircle size="20" color="currentColor" style={{ color: 'var(--mui-palette-info-main)', marginRight: '8px' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  About Vouches
                </Typography>
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                A vouch is a personal verification that helps build trust in the network. Vouches can appear on your profile as trust signals for others.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Vouch - Notification Style */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Personhood Vouch
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: 2, 
            py: 2,
            px: 2,
            backgroundColor: vouchStatus === 'pending' ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'grey.200'
          }}>
            {/* Icon */}
            <Box sx={{ flexShrink: 0, mt: 0.5 }}>
              <UilShieldCheck size="20" color="currentColor" style={{ color: 'var(--mui-palette-primary-main)' }} />
            </Box>

            {/* Content */}
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              {/* Sender Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Avatar
                  src={inviter.avatar}
                  alt={inviter.name}
                  sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                >
                  {inviter.name?.charAt(0)}
                </Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {inviter.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  vouched for your personhood
                </Typography>
              </Box>

              {/* Message */}
              <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.5 }}>
                "I verify {userFirstName} is a real person I know and trust."
              </Typography>

              {/* Checkbox to display vouch - always visible */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={showVouchOnProfile}
                    onChange={(e) => setShowVouchOnProfile(e.target.checked)}
                    size="small"
                    color="primary"
                    disabled={vouchStatus === 'rejected'}
                  />
                }
                label={
                  <Typography variant="caption" color="text.secondary">
                    Display this personhood vouch on my profile
                  </Typography>
                }
                sx={{ 
                  mb: 1,
                  opacity: vouchStatus === 'rejected' ? 0.5 : 1
                }}
              />

              {/* Status and Actions */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {vouchStatus !== 'pending' && (
                  <Chip
                    icon={vouchStatus === 'accepted' ? <UilCheckCircle size="16" /> : <UilClock size="16" />}
                    label={vouchStatus}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.75rem',
                      height: 20,
                      textTransform: 'capitalize',
                      ...(vouchStatus === 'accepted' && {
                        backgroundColor: alpha(theme.palette.success.main, 0.08),
                        borderColor: alpha(theme.palette.success.main, 0.2),
                        color: 'success.main'
                      }),
                      ...(vouchStatus === 'rejected' && {
                        backgroundColor: alpha(theme.palette.error.main, 0.08),
                        borderColor: alpha(theme.palette.error.main, 0.2),
                        color: 'error.main'
                      })
                    }}
                  />
                )}

                {/* Action Buttons */}
                {vouchStatus === 'pending' && (
                  <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                    <button
                      onClick={handleRejectVouch}
                      disabled={isProcessing}
                      style={{
                        minWidth: 60,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        border: '1px solid',
                        borderColor: theme.palette.grey[400],
                        borderRadius: 4,
                        backgroundColor: 'transparent',
                        color: theme.palette.text.primary,
                        cursor: isProcessing ? 'default' : 'pointer',
                        opacity: isProcessing ? 0.6 : 1
                      }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={handleAcceptVouch}
                      disabled={isProcessing}
                      style={{
                        minWidth: 60,
                        fontSize: '0.75rem',
                        padding: '2px 8px',
                        border: 'none',
                        borderRadius: 4,
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        cursor: isProcessing ? 'default' : 'pointer',
                        opacity: isProcessing ? 0.6 : 1
                      }}
                    >
                      Accept
                    </button>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={() => navigate(-1)}
            disabled={isProcessing}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleContinue}
            disabled={connectionStatus === 'pending' || isProcessing}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            {connectionStatus === 'pending' ? 'Accept Connection to Continue' : 'Complete Setup'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};