import type { NavItem } from '../NavigationMenu/types';
import {RelationshipCategory} from "@/constants/relationshipCategories";

export interface SidebarProps {
  navItems: NavItem[];
  expandedItems: Set<string>;
  isActiveRoute: (path: string) => boolean;
  onToggleExpanded: (itemText: string) => void;
  onNavigation: (path: string) => void;
  currentPath: string;
  relationshipCategories: RelationshipCategory[];
}