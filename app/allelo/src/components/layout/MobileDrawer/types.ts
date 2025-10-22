import type { SidebarProps } from '../Sidebar/types';

export interface MobileDrawerProps extends Omit<SidebarProps, 'ref'> {
  drawerWidth: number;
  mobileOpen: boolean;
  onDrawerClose: () => void;
  zIndex: number;
}