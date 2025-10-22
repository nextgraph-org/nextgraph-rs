import type { ReactNode } from 'react';

export interface NavItem {
  text: string;
  icon: ReactNode;
  path: string;
  badge?: number;
  children?: NavItem[];
}

export interface NavigationMenuProps {
  navItems: NavItem[];
  expandedItems: Set<string>;
  isActiveRoute: (path: string) => boolean;
  onToggleExpanded: (itemText: string) => void;
  onNavigation: (path: string) => void;
}