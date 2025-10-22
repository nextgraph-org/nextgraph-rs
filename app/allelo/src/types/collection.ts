export interface BookmarkedItem {
  id: string;
  originalId: string; // ID of the original content
  type: 'post' | 'article' | 'link' | 'image' | 'file' | 'offer' | 'want';
  title: string;
  description?: string;
  content?: string;
  url?: string;
  imageUrl?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  source: string; // Where it was bookmarked from
  bookmarkedAt: Date;
  tags: string[];
  notes?: string; // User's personal notes
  category?: string; // User-defined category
  isRead: boolean;
  isFavorite: boolean;
  lastViewedAt?: Date;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  items: BookmarkedItem[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionFilter {
  type?: string;
  category?: string;
  author?: string;
  isRead?: boolean;
  isFavorite?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
  tags?: string[];
}

export interface CollectionStats {
  totalItems: number;
  unreadItems: number;
  favoriteItems: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  recentlyAdded: number; // Added in last 7 days
}