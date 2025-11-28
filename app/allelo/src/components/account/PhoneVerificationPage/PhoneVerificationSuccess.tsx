import React, {useEffect} from "react";
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
} from "@mui/material";
import {
  CheckCircle,
  Person,
} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import {GreenCheckClaim, IGreenCheckClient, isAccountClaim} from "@/lib/greencheck-api-client/types";
import {useUpdateProfile} from "@/hooks/useUpdateProfile";
import {mapCentralityResponseToSocialContacts, mapGreenCheckClaimToSocialContact} from "@/utils/greenCheckMapper";
import {useLinkedinAccountPerContact} from "@/hooks/contacts/useLinkedinAccountPerContact.ts";

interface PhoneVerificationSuccessProps {
  phoneNumber: string;
  greenCheckId: string;
  claims: GreenCheckClaim[];
  client: IGreenCheckClient;
}

const processedKeys = new Set<string>();

const PhoneVerificationSuccess: React.FC<PhoneVerificationSuccessProps> = ({
                                                                             phoneNumber,
                                                                             greenCheckId,
                                                                             claims,
                                                                             client
                                                                           }) => {
  const navigate = useNavigate();
  const {updateProfile} = useUpdateProfile();
  const accounts = useLinkedinAccountPerContact();

  useEffect(() => {
    if (claims.length === 0) return;

    const key = greenCheckId;
    if (!key || processedKeys.has(key)) return;

    processedKeys.add(key);

    (async () => {
      try {
        await Promise.all(
          claims.map(async (claim) => {
            const socialContact = mapGreenCheckClaimToSocialContact(claim);
            await updateProfile(socialContact);
          })
        );
      } catch (err) {
        console.error("Failed to update profile with claim:", err);
      }
    })();
  }, [claims, greenCheckId, updateProfile]);

  //TODO: endpoint is down now, couldn't check
  /*useEffect(() => {
    if (accounts && Object.keys(accounts).length > 0 && client.authToken) {
      client.generateCentrality(undefined, Object.values(accounts)).then((resp) => {
        if (resp.success) {
          const inverted: Record<string, string> = Object.fromEntries(
            Object.entries(accounts).map(([key, value]) => [value, key])
          );
          console.log(mapCentralityResponseToSocialContacts(resp, inverted));
        }
      })
    }
    
  }, [accounts, client]);*/

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

        <Box sx={{display: 'flex', justifyContent: 'center', mt: 3}}>
          <Button
            variant="contained"
            startIcon={<Person/>}
            onClick={() => navigate('/account')}
            sx={{py: 1.5, px: 4}}
          >
            Return to Profile
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default PhoneVerificationSuccess;