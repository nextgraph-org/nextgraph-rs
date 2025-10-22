import { forwardRef } from 'react';
import { Box, Typography } from '@mui/material';
import { Card } from '@/components/ui';
import { BookmarkedItemCard } from '../BookmarkedItemCard';
import type { ItemGridProps } from '../types';

export const ItemGrid = forwardRef<HTMLDivElement, ItemGridProps>(
  ({
    items,
    searchQuery,
    onToggleFavorite,
    onMarkAsRead,
    onMenuOpen,
    onMenuClose,
    menuAnchor,
  }, ref) => {

    return (
      <Box ref={ref}>
        {items.length === 0 ? (
          <Card sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No bookmarks found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchQuery 
                ? `No bookmarks match "${searchQuery}"`
                : "You haven't bookmarked any content yet"
              }
            </Typography>
          </Card>
        ) : (
          items.map(item => (
            <BookmarkedItemCard
              key={item.id}
              item={item}
              menuAnchor={menuAnchor[item.id]}
              onToggleFavorite={onToggleFavorite}
              onMarkAsRead={onMarkAsRead}
              onMenuOpen={onMenuOpen}
              onMenuClose={() => onMenuClose(item.id)}
            />
          ))
        )}
      </Box>
    );
  }
);

ItemGrid.displayName = 'ItemGrid';