import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  Checkbox,
  FormControlLabel,
  Alert,
  Card,
  CardContent,
  Link,
  Divider,
} from '@mui/material';
import {
  Handshake,
  People,
  Share,
  TrendingUp,
  VerifiedUser,
} from '@mui/icons-material';

export const SocialContractAgreementPage = () => {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!agreed) {
      setError('You must agree to the social contract to continue');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Navigate to the next step in onboarding
      navigate('/onboarding/claim-identity');
    } catch (error) {
      console.error('Failed to process agreement:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgreementChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAgreed(event.target.checked);
    if (event.target.checked && error) {
      setError('');
    }
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
          <Handshake sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 2,
              color: 'text.primary'
            }}
          >
            Join the NAO Network
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Agree to our Social Contract
          </Typography>
        </Box>

        {/* Trust Network Explanation */}
        <Card sx={{ mb: 4, backgroundColor: 'primary.50', border: '1px solid', borderColor: 'primary.200' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                A New Type of Network Built on Trust
              </Typography>
            </Box>
            
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              NAO is a revolutionary social network that puts trust at its core. Using locally hosted trust graphs, 
              our network enables members to run social queries to find trusted connections and opportunities.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <Share sx={{ fontSize: 24, color: 'primary.main', mr: 2, mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Locally Hosted Trust Graphs
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your trust relationships are stored in your personal data vault, giving you complete control
                    while enabling powerful network-wide queries.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <TrendingUp sx={{ fontSize: 24, color: 'primary.main', mr: 2, mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Find Trusted Connections
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Run social queries across the network to discover people and opportunities through
                    chains of trust, not algorithms.
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                <VerifiedUser sx={{ fontSize: 24, color: 'primary.main', mr: 2, mt: 0.5 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Real Trust, Real Value
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Build meaningful relationships based on actual trust, not follower counts or
                    engagement metrics.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Divider sx={{ mb: 3 }} />

        {/* Social Contract Summary */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Our Social Contract
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            By joining NAO, you agree to:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">
              • Build genuine trust relationships and represent them honestly
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Respect the privacy and data sovereignty of all members
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Contribute positively to the network's trust ecosystem
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Use social queries responsibly and for mutual benefit
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • Maintain the integrity of your trust graph
            </Typography>
          </Box>

          <Box sx={{ mt: 2 }}>
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Open full social contract
                console.log('Open full social contract');
              }}
              sx={{ fontSize: '0.875rem', fontWeight: 600 }}
            >
              Read the full Social Contract
            </Link>
          </Box>
        </Box>

        {/* Agreement Checkbox */}
        <FormControlLabel
          control={
            <Checkbox
              checked={agreed}
              onChange={handleAgreementChange}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              I have read, understood, and agree to the NAO Social Contract
            </Typography>
          }
          sx={{ mb: 3 }}
        />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            size="large"
            fullWidth
            onClick={() => navigate(-1)}
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
            onClick={handleSubmit}
            disabled={!agreed || isSubmitting}
            sx={{
              py: 1.5,
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: 2
            }}
          >
            {isSubmitting ? 'Processing...' : 'Accept & Continue'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};