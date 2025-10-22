import type { BookmarkedItem, Collection } from '@/types/collection';

export interface CollectionHeaderProps {
  onQueryClick: () => void;
}

export interface CollectionFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCollection: string;
  onCollectionChange: (collectionId: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  collections: Collection[];
  categories: string[];
}

export interface BookmarkedItemCardProps {
  item: BookmarkedItem;
  menuAnchor: HTMLElement | null;
  onToggleFavorite: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onMenuOpen: (itemId: string, anchorEl: HTMLElement) => void;
  onMenuClose: () => void;
}

export interface ItemGridProps {
  items: BookmarkedItem[];
  searchQuery: string;
  onToggleFavorite: (itemId: string) => void;
  onMarkAsRead: (itemId: string) => void;
  onMenuOpen: (itemId: string, anchorEl: HTMLElement) => void;
  onMenuClose: (itemId: string) => void;
  menuAnchor: { [key: string]: HTMLElement | null };
}

export interface QueryDialogProps {
  open: boolean;
  onClose: () => void;
  queryText: string;
  onQueryTextChange: (text: string) => void;
  onRunQuery: () => void;
}