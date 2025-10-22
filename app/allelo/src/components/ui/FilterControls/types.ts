import { ReactNode } from 'react';

export interface FilterOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface SortOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface FilterControlsProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  sortOptions?: SortOption[];
  currentSort?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, direction: 'asc' | 'desc') => void;
  filterOptions?: FilterOption[];
  activeFilters?: string[];
  onFilterChange?: (filters: string[]) => void;
  onClearAll?: () => void;
  loading?: boolean;
  resultCount?: number;
  showResultCount?: boolean;
}

export interface FilterMenuProps {
  options: FilterOption[];
  activeValues: string[];
  onSelectionChange: (values: string[]) => void;
  anchorEl: HTMLElement | null;
  onClose: () => void;
}