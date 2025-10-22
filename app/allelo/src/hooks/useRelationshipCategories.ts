import type {ReactElement} from 'react';
import {
  Groups,
  Public,
  Business,
  HelpOutline, SvgIconComponent, FamilyRestroom
} from '@mui/icons-material';
import React from 'react';

export interface CategoryColorScheme {
  main: string;
  light: string;
  dark: string;
  bg: string;
}

export interface RelationshipCategory {
  id: string;
  name: string;
  icon: SvgIconComponent;
  color: string;
  colorScheme: CategoryColorScheme;
  count?: number;
}

export interface UseRelationshipCategoriesReturn {
  categories: Record<string, RelationshipCategory>;
  getCategoryById: (id: string) => RelationshipCategory;
  getCategoryIcon: (id?: string, fontSize?: number) => ReactElement;
  getCategoryDisplayName: (id?: string) => string;
  getCategoryColor: (id?: string) => string;
  getCategoryColorScheme: (id?: string) => CategoryColorScheme;
  getMenuItems: () => Array<{ value: string; label: string }>;
  getCategoriesArray: () => RelationshipCategory[];
}

const createIcon = (iconComponent: SvgIconComponent, fontSize?: number) =>
  React.createElement(iconComponent, {sx: {fontSize}});

const relationshipCategories: Record<string, RelationshipCategory> = {
  uncategorized: {
    id: 'uncategorized',
    name: 'Uncategorized',
    icon: HelpOutline,
    color: '#9e9e9e',
    colorScheme: {
      main: '#9e9e9e',
      light: '#bdbdbd',
      dark: '#757575',
      bg: '#f5f5f5'
    },
    count: 0
  },
  friends: {
    id: 'friends',
    name: 'Friends',
    icon: Groups,
    color: '#388e3c',
    colorScheme: {
      main: '#388e3c',
      light: '#81c784',
      dark: '#2e7d32',
      bg: '#e8f5e8'
    },
    count: 0
  },
  family: {
    id: 'family',
    name: 'Family',
    icon: FamilyRestroom,
    color: '#388e3c',
    colorScheme: {
      main: '#388e3c',
      light: '#81c784',
      dark: '#2e7d32',
      bg: '#e8f5e8'
    },
    count: 0
  },
  community: {
    id: 'community',
    name: 'Community',
    icon: Public,
    color: '#1976d2',
    colorScheme: {
      main: '#1976d2',
      light: '#64b5f6',
      dark: '#1565c0',
      bg: '#e3f2fd'
    },
    count: 0
  },
  business: {
    id: 'business',
    name: 'Business',
    icon: Business,
    color: '#7b1fa2',
    colorScheme: {
      main: '#7b1fa2',
      light: '#ba68c8',
      dark: '#6a1b9a',
      bg: '#f3e5f5'
    },
    count: 0
  }
};

export const useRelationshipCategories = (): UseRelationshipCategoriesReturn => {
  const getCategoryById = (id?: string): RelationshipCategory => {
    if (!id || !(id in relationshipCategories)) {
      id = "uncategorized";
    }
    return relationshipCategories[id];
  };

  const getCategoryIcon = (id?: string, fontSize?: number): ReactElement => {
    return createIcon(getCategoryById(id).icon, fontSize);
  };

  const getCategoryDisplayName = (id?: string): string => {
    return getCategoryById(id).name;
  };

  const getCategoryColor = (id?: string): string => {
    return getCategoryById(id).color;
  };

  const getCategoryColorScheme = (id?: string): CategoryColorScheme => {
    if (!id) return relationshipCategories.uncategorized.colorScheme;
    return getCategoryById(id).colorScheme;
  };

  const getMenuItems = () => [
    {value: 'all', label: 'All Relationships'},
    ...Object.values(relationshipCategories)
      .map(cat => ({
        value: cat.id,
        label: cat.name
      }))
  ];

  const getCategoriesArray = () => Object.values(relationshipCategories);

  return {
    categories: relationshipCategories,
    getCategoryById,
    getCategoryIcon,
    getCategoryDisplayName,
    getCategoryColor,
    getCategoryColorScheme,
    getMenuItems,
    getCategoriesArray
  };
};