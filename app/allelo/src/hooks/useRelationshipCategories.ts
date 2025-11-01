import type {ReactElement} from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import type { UniconComponent } from '@iconscout/react-unicons';
import React from 'react';
import {
  CategoryColorScheme,
  relationshipCategories,
  relationshipCategoriesMap,
  defaultRelationshipCategory,
  RelationshipCategory
} from "@/constants/relationshipCategories";

export interface UseRelationshipCategoriesReturn {
  categories: Set<RelationshipCategory>;
  getCategoryById: (id: string) => RelationshipCategory;
  getCategoryIcon: (id?: string, fontSize?: number) => ReactElement;
  getCategoryDisplayName: (id?: string) => string;
  getCategoryColor: (id?: string) => string;
  getCategoryColorScheme: (id?: string) => CategoryColorScheme;
  getMenuItems: () => Array<{ value: string; label: string }>;
  getCategoriesArray: () => RelationshipCategory[];
}

const createIcon = (iconComponent: SvgIconComponent | UniconComponent, fontSize?: number) =>
  React.createElement(iconComponent as any, { sx: { fontSize }, size: fontSize ? `${fontSize}` : '20' });

export const useRelationshipCategories = (): UseRelationshipCategoriesReturn => {
  const getCategoryById = (id?: string): RelationshipCategory => {
    if (!id) {
      return defaultRelationshipCategory;
    }
    return relationshipCategoriesMap.get(id) ?? defaultRelationshipCategory;
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
    if (!id) return defaultRelationshipCategory.colorScheme;
    return getCategoryById(id).colorScheme;
  };

  const getMenuItems = () => [
    {value: 'all', label: 'All Relationships'},
    ...Array.from(relationshipCategories)
      .map(cat => ({
        value: cat.id,
        label: cat.name
      }))
  ];

  const getCategoriesArray = () => Array.from(relationshipCategories).filter(c => c.id !== 'default');

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