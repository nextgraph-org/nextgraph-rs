import React, {useCallback, useState} from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  FormControlLabel,
  Switch,
  FormGroup,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  CheckCircle,
} from "@mui/icons-material";
import {GreenCheckClaim, IGreenCheckClient, isAccountClaim} from "@/lib/greencheck-api-client/types";
import {mapCentralityResponseToSocialContacts} from "@/utils/greenCheckMapper";
import {useUpdateContacts} from "@/hooks/contacts/useUpdateContacts.ts";
import {contactService} from "@/services/contactService.ts";
import {useNextGraphAuth} from "@/lib/nextgraph.ts";
import {NextGraphAuth} from "@/types/nextgraph.ts";

interface PhoneVerificationSuccessProps {
  phoneNumber: string;
  greenCheckId: string;
  claims: GreenCheckClaim[];
  client: IGreenCheckClient;
}

const PhoneVerificationSuccess: React.FC<PhoneVerificationSuccessProps> = ({
                                                                             phoneNumber,
                                                                             greenCheckId,
                                                                             claims,
                                                                             client
                                                                           }) => {
  const {updateContacts} = useUpdateContacts();

  const [retrieveNetworkCentrality, setRetrieveNetworkCentrality] = useState(true);
  const [retrieveProfileDetails, setRetrieveProfileDetails] = useState(true);
  const [enrichmentStatus, setEnrichmentStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;

  const handleEnrichProfile = useCallback(async () => {
    const accounts = await contactService.getAllLinkedinAccountsByContact(session);
    if (accounts && Object.keys(accounts).length > 0 && client.authToken) {
      setEnrichmentStatus('loading');
      setErrorMessage('');
      try {
        const resp = await client.generateCentrality(undefined, Object.values(accounts));
        if (resp.success) {
          const inverted: Record<string, string> = Object.fromEntries(
            Object.entries(accounts).map(([key, value]) => [value, key])
          );
          const updContacts = await mapCentralityResponseToSocialContacts(resp, inverted, retrieveNetworkCentrality, retrieveProfileDetails);
          await updateContacts(updContacts);
          setEnrichmentStatus('success');
        } else {
          setEnrichmentStatus('error');
          setErrorMessage('Failed to retrieve data from GreenCheck. Please try again.');
        }
      } catch (e) {
        console.error(e);
        setEnrichmentStatus('error');
        setErrorMessage(e instanceof Error ? e.message : 'An unexpected error occurred. Please try again.');
      }
    }
  }, [client, retrieveNetworkCentrality, retrieveProfileDetails, session, updateContacts]);

  return (
    <Card sx={{maxWidth: 600, mx: 'auto', mt: 4}}>
      <CardContent sx={{p: {xs: 1, md: 2}}}>
        <Box sx={{textAlign: 'center', mb: 4}}>
          <CheckCircle sx={{fontSize: 64, color: 'success.main', mb: 2}}/>
          <Typography variant="h5" component="h1" gutterBottom sx={{fontWeight: 600}}>
            Phone Verified Successfully!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{mb: 1}}>
            Successfully verified {phoneNumber}
          </Typography>
          <Chip
            label={`GreenCheck ID: ${greenCheckId}`}
            variant="outlined"
            size="small"
            sx={{mt: 1}}
          />
        </Box>

        {claims.length > 0 && (
          <Paper variant="outlined" sx={{mb: 4, p: 2}}>
            <Typography variant="h6" gutterBottom sx={{fontWeight: 600, mb: 2}}>
              Retrieved Claims ({claims.length})
            </Typography>
            <List dense>
              {claims.map((claim, index) => {
                let description = "", avatar = "", descriptionLength = 0;
                if (isAccountClaim(claim)) {
                  description = claim.claimData.description ? '• ' + claim.claimData.description?.substring(0, 50) : "";
                  descriptionLength = description.length;
                  avatar = claim.claimData?.avatar ?? "";
                }

                return <React.Fragment key={claim._id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar
                        src={avatar}
                        sx={{width: 32, height: 32}}
                      >
                        {claim.claimData.username?.[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={claim.claimData.username || claim.claimData.fullname}
                      secondary={`${claim.provider} ${description}${descriptionLength ? '...' : ''}`}
                    />
                    <Chip
                      label={claim.provider}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  </ListItem>
                  {index < Math.min(claims.length, 5) - 1 && <Divider variant="inset" component="li"/>}
                </React.Fragment>
              })}
            </List>
          </Paper>
        )}

        {enrichmentStatus === 'success' ? (
          <Alert severity="success" sx={{mb: 3}}>
            <Typography variant="body1" sx={{fontWeight: 600}}>
              Profile enriched successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Your profile has been updated with data from GreenCheck.
            </Typography>
          </Alert>
        ) : enrichmentStatus === 'error' ? (
          <Alert
            severity="error"
            sx={{mb: 3}}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setEnrichmentStatus('idle')}
              >
                Try Again
              </Button>
            }
          >
            <Typography variant="body1" sx={{fontWeight: 600}}>
              Enrichment Failed
            </Typography>
            <Typography variant="body2">
              {errorMessage}
            </Typography>
          </Alert>
        ) : (
          <Paper variant="outlined" sx={{mb: 3, p: 2}}>
            <Typography variant="h6" gutterBottom sx={{fontWeight: 600, mb: 2}}>
              Enrich Your Contacts with GreenCheck
            </Typography>
            <FormGroup sx={{mb: 2}}>
              <FormControlLabel
              sx={{mb:2}}
                control={
                  <Switch
                    checked={retrieveNetworkCentrality}
                    onChange={(e) => setRetrieveNetworkCentrality(e.target.checked)}
                    disabled={enrichmentStatus === 'loading'}
                  />
                }
                label="Retrieve network graph"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={retrieveProfileDetails}
                    onChange={(e) => setRetrieveProfileDetails(e.target.checked)}
                    disabled={enrichmentStatus === 'loading'}
                  />
                }
                label="Retrieve contacts avatars and location details"
              />
            </FormGroup>
            <Button
              variant="contained"
              color="primary"
              onClick={handleEnrichProfile}
              disabled={(!retrieveNetworkCentrality && !retrieveProfileDetails) || enrichmentStatus === 'loading'}
              fullWidth
              sx={{py: 1.5}}
              startIcon={enrichmentStatus === 'loading' ? <CircularProgress size={20} color="inherit"/> : undefined}
            >
              {enrichmentStatus === 'loading' ? 'Enriching Contacts...' : 'Enrich Contacts'}
            </Button>
          </Paper>
        )}
      </CardContent>
    </Card>
  );
};

export default PhoneVerificationSuccess;