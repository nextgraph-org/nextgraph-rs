import type { SvgIconComponent } from "@mui/icons-material";
import type { UniconComponent } from "@iconscout/react-unicons";
import { UilBuilding as Business, UilUsersAlt as Groups, UilQuestionCircle as HelpOutline, UilGlobe as Public, UilUsersAlt as FamilyRestroom } from "@iconscout/react-unicons";
import {
  businessPermissions,
  communityPermissions,
  ContactPermissions,
  defaultPermissions,
  familyPermissions,
  friendsPermissions
} from "./rPermissions.ts";

export interface CategoryColorScheme {
  main: string;
  light: string;
  dark: string;
  bg: string;
}

export interface RelationshipCategory {
  id: string;
  name: string;
  icon: SvgIconComponent | UniconComponent;
  color: string;
  colorScheme: CategoryColorScheme;
  count?: number;
  permissions: ContactPermissions;
  rerender?: {
    shouldRerender: boolean;
  }
}

export const defaultRelationshipCategory: RelationshipCategory = {
  id: 'default',
  name: 'Default',
  icon: HelpOutline,
  color: '#9e9e9e',
  colorScheme: {
    main: '#9e9e9e',
    light: '#bdbdbd',
    dark: '#757575',
    bg: '#f5f5f5'
  },
  count: 0,
  permissions: defaultPermissions
};

const categoriesArray: RelationshipCategory[] = [
  defaultRelationshipCategory,
  {
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
    count: 0,
    permissions: friendsPermissions
  },
  {
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
    count: 0,
    permissions: familyPermissions
  },
  {
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
    count: 0,
    permissions: communityPermissions
  },
  {
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
    count: 0,
    permissions: businessPermissions
  }
];

export const relationshipCategories = new Set<RelationshipCategory>(categoriesArray);

export const relationshipCategoriesMap = new Map<string, RelationshipCategory>(
  categoriesArray.map(cat => [cat.id, cat])
);