import { forwardRef } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { UilSearch } from '@iconscout/react-unicons';
import type { CollectionFiltersProps } from '../types';

export const CollectionFilters = forwardRef<HTMLDivElement, CollectionFiltersProps>(
  ({
    searchQuery,
    onSearchChange,
    selectedCollection,
    onCollectionChange,
    selectedCategory,
    onCategoryChange,
    collections,
    categories,
  }, ref) => {
    return (
      <Box ref={ref} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search your bookmarks..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <UilSearch size="20" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 6, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Collection</InputLabel>
              <Select
                value={selectedCollection}
                label="Collection"
                onChange={(e) => onCollectionChange(e.target.value)}
              >
                <MenuItem value="all">All Collections</MenuItem>
                {collections.map((collection) => (
                  <MenuItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid size={{ xs: 6, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => onCategoryChange(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
    );
  }
);

CollectionFilters.displayName = 'CollectionFilters';