import {forwardRef} from 'react';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  LinearProgress,
  alpha,
  useTheme
} from '@mui/material';
import {
  UilClock as Schedule,
  UilShield as Security,
  UilShieldCheck as VerifiedUser,
  UilCheckCircle as CheckCircle,
  UilUser as PersonOutline
} from '@iconscout/react-unicons';
import type {Contact} from '@/types/contact';
import {formatDate} from "@/utils/dateHelpers";

export interface ContactDetailsProps {
  contact: Contact | null;
  onHumanityToggle: () => void;
}

export const ContactDetails = forwardRef<HTMLDivElement, ContactDetailsProps>(
  ({contact, onHumanityToggle}, ref) => {
    const theme = useTheme();

    const getHumanityScoreInfo = (score?: number) => {
      const scoreInfo = {
        1: {label: 'Very Low', description: 'Unverified online presence', color: theme.palette.error.main},
        2: {label: 'Low', description: 'Limited verification signals', color: theme.palette.warning.main},
        3: {label: 'Moderate', description: 'Some verification indicators', color: theme.palette.warning.main},
        4: {label: 'High', description: 'Multiple verification sources', color: theme.palette.primary.main},
        5: {label: 'Verified Human', description: 'Confirmed human interaction', color: theme.palette.success.main},
        6: {label: 'Trusted', description: 'Highly trusted individual', color: theme.palette.success.main},
      };
      return score ? scoreInfo[score as keyof typeof scoreInfo] : {
        label: 'Unknown',
        description: 'No humanity assessment',
        color: theme.palette.text.disabled
      };
    };

    const getNaoStatusIndicator = (contact: Contact) => {
      switch (contact.naoStatus?.value) {
        case 'member':
          return {
            icon: <VerifiedUser/>,
            label: 'NAO Member',
            description: 'This person is a verified member of the NAO network.',
            color: theme.palette.success.main,
            bgColor: theme.palette.success.light + '20',
            borderColor: theme.palette.success.main
          };
        case 'invited':
          return {
            icon: <CheckCircle/>,
            label: 'NAO Invited',
            description: 'This person has been invited to join the NAO network.',
            color: theme.palette.warning.main,
            bgColor: theme.palette.warning.light + '20',
            borderColor: theme.palette.warning.main
          };
        default:
          return {
            icon: <PersonOutline/>,
            label: 'Not in NAO',
            description: 'This person has not been invited to the NAO network yet.',
            color: theme.palette.text.secondary,
            bgColor: 'transparent',
            borderColor: theme.palette.divider
          };
      }
    };

    if (!contact) return null;

    const humanityInfo = getHumanityScoreInfo(contact.humanityConfidenceScore);
    const naoStatus = getNaoStatusIndicator(contact);

    return (
      <Card variant="outlined" ref={ref}>
        <CardContent sx={{p: {xs: 2, md: 3}}}>
          <Typography variant="h6" gutterBottom>
            Additional Information
          </Typography>

          {/* Humanity Confidence Score */}
          {/*<Box sx={{mb: 3}}>*/}
          {/*  <Typography variant="body2" color="text.secondary" gutterBottom>*/}
          {/*    Level of Humanity*/}
          {/*  </Typography>*/}
          {/*  <Box sx={{*/}
          {/*    p: 2,*/}
          {/*    borderRadius: 2,*/}
          {/*    backgroundColor: alpha(humanityInfo.color, 0.08),*/}
          {/*    border: 1,*/}
          {/*    borderColor: alpha(humanityInfo.color, 0.2)*/}
          {/*  }}>*/}
          {/*    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2}}>*/}
          {/*      <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}>*/}
          {/*        <Security sx={{color: humanityInfo.color}}/>*/}
          {/*        <Typography variant="body2" sx={{fontWeight: 600, color: humanityInfo.color}}>*/}
          {/*          {humanityInfo.label}*/}
          {/*        </Typography>*/}
          {/*      </Box>*/}
          {/*      <FormControlLabel*/}
          {/*        control={*/}
          {/*          <Switch*/}
          {/*            checked={contact.humanityConfidenceScore === 5}*/}
          {/*            onChange={onHumanityToggle}*/}
          {/*            size="small"*/}
          {/*            color="primary"*/}
          {/*          />*/}
          {/*        }*/}
          {/*        label="Human Verified"*/}
          {/*        labelPlacement="start"*/}
          {/*        sx={{*/}
          {/*          m: 0,*/}
          {/*          '& .MuiFormControlLabel-label': {*/}
          {/*            fontSize: '0.875rem',*/}
          {/*            color: 'text.secondary'*/}
          {/*          }*/}
          {/*        }}*/}
          {/*      />*/}
          {/*    </Box>*/}

          {/*    <Box sx={{mb: 2}}>*/}
          {/*      <LinearProgress*/}
          {/*        variant="determinate"*/}
          {/*        value={(contact.humanityConfidenceScore || 0) * 16.67}*/}
          {/*        sx={{*/}
          {/*          height: 8,*/}
          {/*          borderRadius: 4,*/}
          {/*          backgroundColor: alpha(humanityInfo.color, 0.2),*/}
          {/*          '& .MuiLinearProgress-bar': {*/}
          {/*            backgroundColor: humanityInfo.color,*/}
          {/*            borderRadius: 4,*/}
          {/*          },*/}
          {/*        }}*/}
          {/*      />*/}
          {/*      <Box sx={{display: 'flex', justifyContent: 'space-between', mt: 0.5}}>*/}
          {/*        <Typography variant="caption" color="text.secondary">*/}
          {/*          Score: {contact.humanityConfidenceScore || 0}/6*/}
          {/*        </Typography>*/}
          {/*        <Typography variant="caption" color="text.secondary">*/}
          {/*          {Math.round((contact.humanityConfidenceScore || 0) * 16.67)}%*/}
          {/*        </Typography>*/}
          {/*      </Box>*/}
          {/*    </Box>*/}

          {/*    <Typography variant="body2" color="text.secondary">*/}
          {/*      {humanityInfo.description}*/}
          {/*    </Typography>*/}
          {/*  </Box>*/}
          {/*</Box>*/}

          {contact.createdAt && <Box sx={{display: 'flex', alignItems: 'center', mb: 2}}>
            <Schedule sx={{mr: 2, color: 'text.secondary'}}/>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Added
              </Typography>
              <Typography variant="body1">
                {formatDate(new Date(contact.createdAt.valueDateTime))}
              </Typography>
            </Box>
          </Box>}

          {contact.updatedAt && <Box sx={{display: 'flex', alignItems: 'center', mb: 2}}>
            <Schedule sx={{mr: 2, color: 'text.secondary'}}/>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Last Updated
              </Typography>
              <Typography variant="body1">
                {formatDate(new Date(contact.updatedAt.valueDateTime))}
              </Typography>
            </Box>
          </Box>}

          {contact.lastInteractionAt && (
            <Box sx={{display: 'flex', alignItems: 'center', mb: 2}}>
              <Schedule sx={{mr: 2, color: 'text.secondary'}}/>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Last Interaction
                </Typography>
                <Typography variant="body1">
                  {formatDate(contact.lastInteractionAt)}
                </Typography>
              </Box>
            </Box>
          )}

          {/* NAO Status Details */}
          <Box sx={{mt: 2}}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              NAO Network Status
            </Typography>
            <Box sx={{
              p: 2,
              borderRadius: 2,
              backgroundColor: naoStatus.bgColor,
              border: 1,
              borderColor: naoStatus.borderColor
            }}>
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mb: 1}}>
                {naoStatus.icon}
                <Typography variant="body2" sx={{fontWeight: 600, color: naoStatus.color}}>
                  {naoStatus.label}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                {naoStatus.description}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }
);

ContactDetails.displayName = 'ContactDetails';