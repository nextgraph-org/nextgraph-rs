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
  MenuItem, alpha, useTheme, Divider,
  Button,
} from '@mui/material';
import {
  MoreVert,
  Favorite,
  FavoriteBorder,
  Edit,
  Delete,
  Launch,
  PostAdd,
  LocalOffer,
  ShoppingCart,
  Image as ImageIcon,
  Link as LinkIcon,
  AttachFile,
  Article,
  FolderOpen, Visibility,
} from '@mui/icons-material';
import type { BookmarkedItemCardProps } from '../types';
import {formatDateDiff} from "@/utils/dateHelpers";

export const BookmarkedItemCard = forwardRef<HTMLDivElement, BookmarkedItemCardProps>(
  ({
    item,
    menuAnchor,
    onToggleFavorite,
    onMarkAsRead,
    onMenuOpen,
    onMenuClose,
  }, ref) => {
    const theme = useTheme();

    const getContentIcon = (type: string) => {
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

    return (
      <Card ref={ref} sx={{ mb: 2 }}>
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
                  {item.category && (
                    <Chip 
                      label={item.category} 
                      size="small" 
                      variant="outlined"
                      color="secondary"
                    />
                  )}
                  {!item.isRead && (
                    <Chip 
                      label="Unread" 
                      size="small" 
                      color="warning"
                    />
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {formatDateDiff(item.bookmarkedAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton 
                size="small" 
                onClick={() => onToggleFavorite(item.id)}
                color={item.isFavorite ? 'error' : 'default'}
              >
                {item.isFavorite ? <Favorite /> : <FavoriteBorder />}
              </IconButton>
              <IconButton 
                size="small" 
                onClick={(e) => onMenuOpen(item.id, e.currentTarget)}
              >
                <MoreVert />
              </IconButton>
            </Box>
          </Box>

          {/* Author */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Avatar src={item.author.avatar} sx={{ width: 24, height: 24 }}>
              {item.author.name.charAt(0)}
            </Avatar>
            <Typography variant="body2" color="text.secondary">
              by {item.author.name} • {item.source}
            </Typography>
          </Box>

          {/* Content */}
          {item.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {item.description}
            </Typography>
          )}

          {/* Image for image type */}
          {item.type === 'image' && item.imageUrl && (
            <Box
              component="img"
              src={item.imageUrl}
              sx={{
                width: '100%',
                maxHeight: 200,
                objectFit: 'cover',
                borderRadius: 1,
                mb: 2,
              }}
            />
          )}

          {/* User Notes */}
          {item.notes && (
            <Box sx={{
              p: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.04),
              borderRadius: 1,
              mb: 2,
              borderLeft: 4,
              borderColor: 'primary.main'
            }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                "{item.notes}"
              </Typography>
            </Box>
          )}

          {/* Tags */}
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

          {/* Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {!item.isRead && (
                <Button
                  size="small"
                  onClick={() => onMarkAsRead(item.id)}
                  startIcon={<Visibility />}
                >
                  Mark as Read
                </Button>
              )}
              <Button size="small" startIcon={<Launch />}>
                Open
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Saved {formatDateDiff(item.bookmarkedAt)}
            </Typography>
          </Box>
        </CardContent>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={onMenuClose}
        >
          <MenuItem onClick={() => { onMarkAsRead(item.id); onMenuClose(); }}>
            <Edit sx={{ mr: 1 }} /> Mark as Read
          </MenuItem>
          <MenuItem onClick={onMenuClose}>
            <FolderOpen sx={{ mr: 1 }} /> Move to Collection
          </MenuItem>
          <MenuItem onClick={onMenuClose}>
            <Launch sx={{ mr: 1 }} /> Open Original
          </MenuItem>
          <MenuItem onClick={onMenuClose}>
            <Delete sx={{ mr: 1 }} /> Remove
          </MenuItem>
        </Menu>
      </Card>
    );
  }
);

BookmarkedItemCard.displayName = 'BookmarkedItemCard';