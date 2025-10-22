import { forwardRef } from 'react';
import {
  Dialog as MuiDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Box,
  LinearProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { DialogProps } from './types';

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(
  ({ 
    open, 
    onClose, 
    title, 
    children, 
    actions, 
    loading = false, 
    maxWidth = 'sm',
    fullWidth = true,
    ...props 
  }, ref) => {
    return (
      <MuiDialog
        ref={ref}
        open={open}
        onClose={onClose}
        maxWidth={maxWidth}
        fullWidth={fullWidth}
        {...props}
      >
        {title && (
          <DialogTitle>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="h6" component="div">
                {title}
              </Typography>
              <IconButton
                aria-label="close"
                onClick={onClose}
                size="small"
                sx={{
                  color: (theme) => theme.palette.grey[500],
                }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          </DialogTitle>
        )}
        
        {loading && (
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
        )}
        
        <DialogContent dividers={!!title}>
          {children}
        </DialogContent>
        
        {actions && (
          <DialogActions>
            {actions}
          </DialogActions>
        )}
      </MuiDialog>
    );
  }
);

Dialog.displayName = 'Dialog';