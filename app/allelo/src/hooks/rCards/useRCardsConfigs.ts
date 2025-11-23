import {ReactElement, useCallback} from 'react';
import type {SvgIconComponent} from '@mui/icons-material';
import type {UniconComponent} from '@iconscout/react-unicons';
import React from 'react';
import {
  CategoryColorScheme,
  relationshipCategoriesMap,
  defaultRelationshipCategory,
  RelationshipCategory
} from "@/constants/relationshipCategories.ts";

export interface UseRelationshipCategoriesReturn {
  getCategoryById: (id: string) => RelationshipCategory;
  getCategoryIcon: (id?: string, fontSize?: number) => ReactElement;
  getCategoryDisplayName: (id?: string) => string;
  getCategoryColor: (id?: string) => string;
  getCategoryColorScheme: (id?: string) => CategoryColorScheme;
}

const createIcon = (iconComponent: SvgIconComponent | UniconComponent, fontSize?: number) =>
  React.createElement(iconComponent as any, {sx: {fontSize}, size: fontSize ? `${fontSize}` : '20'});

export const useRCardsConfigs = (): UseRelationshipCategoriesReturn => {
  const getCategoryById = useCallback((id?: string): RelationshipCategory => {
    if (!id) {
      return defaultRelationshipCategory;
    }
    return relationshipCategoriesMap.get(id) ?? defaultRelationshipCategory;
  }, []);

  const getCategoryIcon = useCallback((id?: string, fontSize?: number): ReactElement => {
    return createIcon(getCategoryById(id).icon, fontSize);
  }, [getCategoryById]);

  const getCategoryDisplayName = useCallback((id?: string): string => {
    return getCategoryById(id).name;
  }, [getCategoryById]);

  const getCategoryColor = useCallback((id?: string): string => {
    return getCategoryById(id).color;
  }, [getCategoryById]);

  const getCategoryColorScheme = useCallback((id?: string): CategoryColorScheme => {
    if (!id) return defaultRelationshipCategory.colorScheme;
    return getCategoryById(id).colorScheme;
  }, [getCategoryById]);

  return {
    getCategoryById,
    getCategoryIcon,
    getCategoryDisplayName,
    getCategoryColor,
    getCategoryColorScheme,
  };
};