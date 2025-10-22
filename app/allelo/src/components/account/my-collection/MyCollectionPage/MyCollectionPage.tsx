import { useState } from 'react';
import { Box } from '@mui/material';
import { useMyCollection } from '@/hooks/useMyCollection';
import { CollectionHeader } from '../CollectionHeader';
import { CollectionFilters } from '../CollectionFilters';
import { ItemGrid } from '../ItemGrid';
import { QueryDialog } from '../QueryDialog';

export const MyCollectionPage = () => {
  const {
    items,
    collections,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCollection,
    setSelectedCollection,
    selectedCategory,
    setSelectedCategory,
    handleToggleFavorite,
    handleMarkAsRead,
  } = useMyCollection();
  
  const [menuAnchor, setMenuAnchor] = useState<{ [key: string]: HTMLElement | null }>({});
  const [showQueryDialog, setShowQueryDialog] = useState(false);
  const [queryText, setQueryText] = useState('');

  const handleMenuOpen = (itemId: string, anchorEl: HTMLElement) => {
    setMenuAnchor(prev => ({ ...prev, [itemId]: anchorEl }));
  };

  const handleMenuClose = (itemId: string) => {
    setMenuAnchor(prev => ({ ...prev, [itemId]: null }));
  };

  const handleRunQuery = () => {
    console.log('Running query:', queryText);
    setShowQueryDialog(false);
    setQueryText('');
  };

  return (
    <Box>
      <CollectionHeader onQueryClick={() => setShowQueryDialog(true)} />
      
      <CollectionFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCollection={selectedCollection}
        onCollectionChange={setSelectedCollection}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        collections={collections}
        categories={categories}
      />

      <ItemGrid
        items={items}
        searchQuery={searchQuery}
        onToggleFavorite={handleToggleFavorite}
        onMarkAsRead={handleMarkAsRead}
        onMenuOpen={handleMenuOpen}
        onMenuClose={handleMenuClose}
        menuAnchor={menuAnchor}
      />

      <QueryDialog
        open={showQueryDialog}
        onClose={() => setShowQueryDialog(false)}
        queryText={queryText}
        onQueryTextChange={setQueryText}
        onRunQuery={handleRunQuery}
      />
    </Box>
  );
};