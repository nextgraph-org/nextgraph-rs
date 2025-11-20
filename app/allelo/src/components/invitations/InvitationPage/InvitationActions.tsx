import { forwardRef } from 'react';
import {
  Typography,
  Box,
  Paper,
  Button,
  Grid,
} from '@mui/material';
import {
  UilDownloadAlt,
} from '@iconscout/react-unicons';
import { QRCodeSVG } from 'qrcode.react';
import type { Group } from '@/types/group';

export interface InvitationActionsProps {
  group: Group | null;
  isGroupInvite: boolean;
  onDownloadQR: () => void;
  onNewInvitation: () => void;
}

export const InvitationActions = forwardRef<HTMLDivElement, InvitationActionsProps>(
  ({ 
    group,
    isGroupInvite,
    onDownloadQR,
  }, ref) => {
    //TODO: replace with real QR
    return (
      <Box ref={ref}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 12 }}>
            <Paper sx={{ p: 3, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                QR Code
              </Typography>
              <Box sx={{ mb: 2 }}>
                <QRCodeSVG
                  id="qr-code-svg"
                  value={"balue"}
                  size={200}
                  level="M"
                  includeMargin={true}
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {isGroupInvite 
                  ? `Scan to join ${group?.name}`
                  : 'Scan to join your network'
                }
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<UilDownloadAlt size="20" />}
                  onClick={onDownloadQR}
                  size="small"
                >
                  Download
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/*<Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" gutterBottom>
                Share Link
              </Typography>
              <TextField
                fullWidth
                value={invitationUrl}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={onCopyToClipboard}
                        edge="end"
                        size="small"
                      >
                        <UilCopy size="20" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Invitation ID: {invitationId}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>
                Share via:
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<UilShareAlt size="20" />}
                  onClick={onShare}
                  size="small"
                >
                  Share
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UilEnvelope size="20" />}
                  onClick={onEmailShare}
                  size="small"
                >
                  Email
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<WhatsApp />}
                  onClick={onWhatsAppShare}
                  size="small"
                  sx={{ color: '#25D366' }}
                >
                  WhatsApp
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<UilMessage size="20" />}
                  onClick={onSMSShare}
                  size="small"
                >
                  SMS
                </Button>
              </Box>
            </Paper>
          </Grid>*/}
        </Grid>
      </Box>
    );
  }
);

InvitationActions.displayName = 'InvitationActions';