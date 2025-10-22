import { forwardRef } from 'react';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Avatar,
  alpha,
  useTheme,
} from '@mui/material';
import { AutoAwesome, Send } from '@mui/icons-material';
import type { QueryDialogProps } from '../types';

export const QueryDialog = forwardRef<HTMLDivElement, QueryDialogProps>(
  ({
    open,
    onClose,
    queryText,
    onQueryTextChange,
    onRunQuery,
  }, ref) => {
    const theme = useTheme();

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (queryText.trim()) {
          onRunQuery();
        }
      }
    };

    return (
      <Dialog ref={ref} open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome />
            AI Query Assistant
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ 
            height: 400, 
            display: 'flex', 
            flexDirection: 'column',
            bgcolor: alpha(theme.palette.background.default, 0.5)
          }}>
            <Box sx={{ 
              flexGrow: 1, 
              p: 3, 
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                  <AutoAwesome fontSize="small" />
                </Avatar>
                <Box sx={{ 
                  bgcolor: 'background.paper',
                  p: 2,
                  borderRadius: 2,
                  border: 1,
                  borderColor: 'divider',
                  maxWidth: '80%'
                }}>
                  <Typography variant="body2">
                    Hi! I'm your AI assistant. I can help you search and analyze your bookmarked content. 
                    Ask me anything about your saved articles, posts, and notes.
                  </Typography>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ 
              p: 2, 
              borderTop: 1, 
              borderColor: 'divider',
              bgcolor: 'background.paper'
            }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  multiline
                  maxRows={4}
                  placeholder="Ask me about your collection... (e.g., Show me all articles about design systems from the last month)"
                  value={queryText}
                  onChange={(e) => onQueryTextChange(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                      bgcolor: alpha(theme.palette.background.default, 0.5),
                      '&:hover': {
                        bgcolor: alpha(theme.palette.background.default, 0.7),
                      },
                      '&.Mui-focused': {
                        bgcolor: 'background.paper',
                      }
                    }
                  }}
                  onKeyDown={handleKeyDown}
                />
                <Button
                  variant="contained"
                  onClick={onRunQuery}
                  disabled={!queryText.trim()}
                  sx={{ 
                    minWidth: 'auto',
                    px: 2,
                    borderRadius: 3,
                    height: 40
                  }}
                >
                  <Send fontSize="small" />
                </Button>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Press Enter to send, Shift+Enter for new line
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }
);

QueryDialog.displayName = 'QueryDialog';