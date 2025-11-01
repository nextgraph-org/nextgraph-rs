import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import {
  UilShieldCheck as VerifiedUser,
} from '@iconscout/react-unicons';
import type { PersonhoodCredentials } from '@/types/personhood';

interface PersonhoodCredentialsProps {
  credentials: PersonhoodCredentials;
  onRefreshCredentials?: () => void;
}

const PersonhoodCredentialsComponent = ({ 
  credentials
}: PersonhoodCredentialsProps) => {
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


  return (
    <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <VerifiedUser color="primary" sx={{ fontSize: 28 }} />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Personhood Credentials
              </Typography>
              <Typography variant="body2" color="text.secondary">
                People that have verified your personhood through real world connections
              </Typography>
            </Box>
          </Box>
          
          {credentials.verifications.slice(0, 3).map((verification) => (
            <Box key={verification.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1 }}>
              <Avatar src={verification.verifierAvatar} sx={{ width: 40, height: 40 }}>
                {verification.verifierName.charAt(0)}
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {verification.verifierName}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {verification.verifierJobTitle && (
                    <Typography variant="caption" color="text.secondary">
                      {verification.verifierJobTitle}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    • {formatRelativeTime(verification.verifiedAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}

          {credentials.verifications.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                No verifications yet. Share your QR code with trusted contacts to start building your personhood credentials.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
  );
};

export default PersonhoodCredentialsComponent;