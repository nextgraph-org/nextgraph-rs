import type { UserContent, ContentStats, ContentType } from '@/types/userContent';

export interface WelcomeBannerProps {
  userName?: string;
  contentStats: ContentStats;
}

export interface QuickActionsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTab: 'all' | ContentType;
  onTabChange: (tab: 'all' | ContentType) => void;
  filterMenuAnchor: HTMLElement | null;
  onFilterMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onFilterMenuClose: () => void;
  contentStats: ContentStats;
}

export interface RecentActivityProps {
  content: UserContent[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTab: 'all' | ContentType;
  onTabChange: (tab: 'all' | ContentType) => void;
  onContentAction: (contentId: string, action: string) => void;
  onMenuOpen: (contentId: string, anchorEl: HTMLElement) => void;
  onMenuClose: (contentId: string) => void;
  menuAnchor: { [key: string]: HTMLElement | null };
}

export interface MyHomePageProps {
  className?: string;
}