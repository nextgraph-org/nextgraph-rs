import type { ReactNode } from 'react';

export interface DashboardLayoutProps {
  children: ReactNode;
}

export interface DashboardLayoutState {
  mobileOpen: boolean;
  expandedItems: Set<string>;
  dragOverCategory: string | null;
}