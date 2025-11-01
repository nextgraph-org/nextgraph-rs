import { forwardRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  UilEye as Visibility,
  UilCommentAlt as Comment,
  UilFileAlt as Article,
  UilImage as ImageIcon,
  UilLink as LinkIcon,
  UilPaperclip as AttachFile,
  UilTag as LocalOffer,
  UilShoppingCart as ShoppingCart,
  UilPostcard as PostAdd,
} from '@iconscout/react-unicons';
import type { WelcomeBannerProps } from '../types';

export const WelcomeBanner = forwardRef<HTMLDivElement, WelcomeBannerProps>(
  ({ contentStats }, ref) => {
    return (
      <Box ref={ref} sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
          My Stream
        </Typography>
        
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Content Overview
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PostAdd fontSize="small" />
                <Typography variant="body2">Posts:</Typography>
                <Chip size="small" label={contentStats.byType.post} variant="outlined" />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOffer fontSize="small" />
                <Typography variant="body2">Offers:</Typography>
                <Chip size="small" label={contentStats.byType.offer} variant="outlined" />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShoppingCart fontSize="small" />
                <Typography variant="body2">Wants:</Typography>
                <Chip size="small" label={contentStats.byType.want} variant="outlined" />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ImageIcon fontSize="small" />
                <Typography variant="body2">Images:</Typography>
                <Chip size="small" label={contentStats.byType.image} variant="outlined" />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon fontSize="small" />
                <Typography variant="body2">Links:</Typography>
                <Chip size="small" label={contentStats.byType.link} variant="outlined" />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AttachFile fontSize="small" />
                <Typography variant="body2">Files:</Typography>
                <Chip size="small" label={contentStats.byType.file} variant="outlined" />
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Article fontSize="small" />
                <Typography variant="body2">Articles:</Typography>
                <Chip size="small" label={contentStats.byType.article} variant="outlined" />
              </Box>
            </Box>
            
            <Box sx={{ mt: 3, display: 'flex', gap: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Visibility fontSize="small" />
                <Typography variant="body2">Total Views:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {contentStats.totalViews}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Comment fontSize="small" />
                <Typography variant="body2">Total Comments:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {contentStats.totalComments}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }
);

WelcomeBanner.displayName = 'WelcomeBanner';