import { forwardRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Divider,
} from '@mui/material';
import {
  MoreVert,
  Visibility,
  VisibilityOff,
  Edit,
  Delete,
  Share,
  Comment,
  Download,
  Launch,
  Article,
  Image as ImageIcon,
  Link as LinkIcon,
  AttachFile,
  LocalOffer,
  ShoppingCart,
  PostAdd,
} from '@mui/icons-material';
import type { RecentActivityProps } from '../types';
import type { UserContent, ContentType } from '@/types/userContent';
import {formatDateDiff} from "@/utils/dateHelpers";

export const RecentActivity = forwardRef<HTMLDivElement, RecentActivityProps>(
  ({ 
    content,
    onContentAction,
    onMenuOpen,
    onMenuClose,
    menuAnchor
  }, ref) => {
    const getContentIcon = (type: ContentType) => {
      switch (type) {
        case 'post': return <PostAdd />;
        case 'offer': return <LocalOffer />;
        case 'want': return <ShoppingCart />;
        case 'image': return <ImageIcon />;
        case 'link': return <LinkIcon />;
        case 'file': return <AttachFile />;
        case 'article': return <Article />;
        default: return <PostAdd />;
      }
    };

    const getVisibilityIcon = (visibility: string) => {
      switch (visibility) {
        case 'public': return <Visibility />;
        case 'network': return <VisibilityOff />;
        case 'private': return <VisibilityOff />;
        default: return <Visibility />;
      }
    };

    const formatFileSize = (bytes: number) => {
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 Bytes';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    const handleMenuOpen = (contentId: string, event: React.MouseEvent<HTMLElement>) => {
      onMenuOpen(contentId, event.currentTarget);
    };

    const handleMenuClose = (contentId: string) => {
      onMenuClose(contentId);
    };

    const handleContentAction = (contentId: string, action: string) => {
      onContentAction(contentId, action);
      handleMenuClose(contentId);
    };

    const renderContentItem = (item: UserContent) => (
      <Card key={item.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                {getContentIcon(item.type)}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {item.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip 
                    label={item.type.charAt(0).toUpperCase() + item.type.slice(1)} 
                    size="small" 
                    variant="outlined"
                  />
                  <Chip 
                    icon={getVisibilityIcon(item.visibility)}
                    label={item.visibility.charAt(0).toUpperCase() + item.visibility.slice(1)} 
                    size="small" 
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatDateDiff(item.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <IconButton 
              size="small" 
              onClick={(e) => handleMenuOpen(item.id, e)}
            >
              <MoreVert />
            </IconButton>
          </Box>

          {(item.type === 'post' || item.type === 'article') && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {'content' in item ? item.content.substring(0, 200) + (item.content.length > 200 ? '...' : '') : ''}
            </Typography>
          )}

          {item.type === 'offer' && 'price' in item && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {item.content}
              </Typography>
              <Chip label={item.price} color="success" size="small" />
              <Chip label={item.availability} color="primary" size="small" sx={{ ml: 1 }} />
            </Box>
          )}

          {item.type === 'want' && 'budget' in item && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {item.content}
              </Typography>
              <Chip label={item.budget} color="info" size="small" />
              <Chip label={`${item.urgency} priority`} color="warning" size="small" sx={{ ml: 1 }} />
            </Box>
          )}

          {item.type === 'link' && 'url' in item && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {item.linkTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {item.linkDescription}
              </Typography>
              <Typography variant="caption" color="primary.main">
                {item.domain}
              </Typography>
            </Box>
          )}

          {item.type === 'image' && 'imageUrl' in item && (
            <Box sx={{ mb: 2 }}>
              <Box
                component="img"
                src={item.imageUrl}
                alt={item.imageAlt}
                sx={{
                  width: '100%',
                  maxHeight: 300,
                  objectFit: 'cover',
                  borderRadius: 1,
                  mb: 1,
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {item.caption}
              </Typography>
            </Box>
          )}

          {item.type === 'file' && 'fileName' in item && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
              <AttachFile />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="subtitle2">{item.fileName}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatFileSize(item.fileSize)} • {item.downloadCount} downloads
                </Typography>
              </Box>
              <Button size="small" startIcon={<Download />}>
                Download
              </Button>
            </Box>
          )}

          {item.type === 'article' && 'readTime' in item && (
            <Box sx={{ mb: 2 }}>
              {'featuredImage' in item && item.featuredImage && (
                <Box
                  component="img"
                  src={item.featuredImage}
                  sx={{
                    width: '100%',
                    height: 200,
                    objectFit: 'cover',
                    borderRadius: 1,
                    mb: 2,
                  }}
                />
              )}
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {item.excerpt}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {item.readTime} min read
              </Typography>
            </Box>
          )}

          {item.tags && item.tags.length > 0 && (
            <Box sx={{ mb: 2 }}>
              {item.tags.map((tag) => (
                <Chip 
                  key={tag} 
                  label={tag} 
                  size="small" 
                  variant="outlined" 
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          )}

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Comment fontSize="small" />
                <Typography variant="caption">{item.commentCount}</Typography>
              </Box>
            </Box>
            <Button size="small" startIcon={<Share />}>
              Share
            </Button>
          </Box>
        </CardContent>

        <Menu
          anchorEl={menuAnchor[item.id]}
          open={Boolean(menuAnchor[item.id])}
          onClose={() => handleMenuClose(item.id)}
        >
          <MenuItem onClick={() => handleContentAction(item.id, 'edit')}>
            <Edit sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={() => handleContentAction(item.id, 'view')}>
            <Launch sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem onClick={() => handleContentAction(item.id, 'delete')}>
            <Delete sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>
      </Card>
    );

    return (
      <Box ref={ref}>
        {content.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No content found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You haven't shared any content yet
              </Typography>
            </CardContent>
          </Card>
        ) : (
          content.map(renderContentItem)
        )}
      </Box>
    );
  }
);

RecentActivity.displayName = 'RecentActivity';