import { useState } from 'react';
import { Box, Typography, Button, TextField } from '@mui/material';

interface GroupLink {
  title: string;
  url: string;
  shared: string;
}

interface GroupLinksProps {
  links?: GroupLink[];
  isLoading?: boolean;
  onAddLink?: (title: string, url: string) => void;
  onRemoveLink?: (url: string) => void;
}

const mockLinks: GroupLink[] = [
  { title: 'NAO Protocol Documentation', url: 'https://docs.nao.org', shared: 'Oliver S-B' },
  { title: 'Group Governance Proposal', url: 'https://github.com/nao/governance', shared: 'Sarah Chen' },
  { title: 'Meeting Recording - Jan 15', url: 'https://zoom.us/rec/123', shared: 'Mike Torres' }
];

export const GroupLinks = ({ 
  links = mockLinks, 
  isLoading, 
  onAddLink
}: GroupLinksProps) => {
  const [newLinkUrl, setNewLinkUrl] = useState('');

  if (isLoading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography color="text.secondary">Loading links...</Typography>
      </Box>
    );
  }

  const handleAddLink = () => {
    if (newLinkUrl.trim() && onAddLink) {
      const title = newLinkUrl.split('/').pop() || newLinkUrl;
      onAddLink(title, newLinkUrl);
      setNewLinkUrl('');
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddLink();
    }
  };

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Group Links</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="Add a link..."
            size="small"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <Button 
            variant="contained" 
            onClick={handleAddLink}
            disabled={!newLinkUrl.trim()}
          >
            Add
          </Button>
        </Box>
        
        <Typography variant="subtitle2">Shared Links:</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {links.map((link, index) => (
            <Box key={index} sx={{ p: 2, border: 1, borderColor: 'grey.200', borderRadius: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>{link.title}</Typography>
              <Typography 
                variant="body2" 
                color="primary.main" 
                sx={{ cursor: 'pointer' }}
                onClick={() => window.open(link.url, '_blank')}
              >
                {link.url}
              </Typography>
              <Typography variant="caption" color="text.secondary">Shared by {link.shared}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};