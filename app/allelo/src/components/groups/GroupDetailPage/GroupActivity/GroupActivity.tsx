import { Box, Typography } from '@mui/material';
import type { GroupMessage } from '../types';

interface GroupActivityProps {
  messages: GroupMessage[];
  vouches: Array<{
    id: string;
    giver: string;
    receiver: string;
    message: string;
    timestamp: Date;
    type: 'vouch';
    tags: string[];
  }>;
  isLoading?: boolean;
}

export const GroupActivity = ({ messages, vouches, isLoading }: GroupActivityProps) => {
  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading activity...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Recent Activity</Typography>
        <Typography variant="body2" color="text.secondary">
          This view combines posts, messages, and vouches in chronological order.
        </Typography>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: '1 1 300px', minHeight: 300, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Recent Messages</Typography>
          {messages.slice(-3).map((message) => (
            <Box key={message.id} sx={{ mb: 1, p: 1, bgcolor: message.isOwn ? 'primary.light' : 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">{message.sender}</Typography>
              <Typography variant="body2">{message.text}</Typography>
            </Box>
          ))}
        </Box>
        
        <Box sx={{ flex: '1 1 300px', minHeight: 300, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>Recent Vouches</Typography>
          {vouches.map((vouch) => (
            <Box key={vouch.id} sx={{ mb: 1, p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                {vouch.giver} → {vouch.receiver}
              </Typography>
              <Typography variant="body2">{vouch.message}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};