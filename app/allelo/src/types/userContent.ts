export type ContentType = 'post' | 'offer' | 'want' | 'image' | 'link' | 'file' | 'article';

export interface BaseContent {
  id: string;
  type: ContentType;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  visibility: 'public' | 'network' | 'private';
  viewCount: number;
  likeCount: number;
  commentCount: number;
  rCardIds: string[]; // Which rCards can see this content
}

export interface Post extends BaseContent {
  type: 'post';
  content: string;
  attachments?: string[];
}

export interface Offer extends BaseContent {
  type: 'offer';
  content: string;
  category: string;
  price?: string;
  availability: 'available' | 'pending' | 'completed';
  location?: string;
}

export interface Want extends BaseContent {
  type: 'want';
  content: string;
  category: string;
  budget?: string;
  urgency: 'low' | 'medium' | 'high';
  location?: string;
}

export interface Image extends BaseContent {
  type: 'image';
  imageUrl: string;
  imageAlt: string;
  caption?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface Link extends BaseContent {
  type: 'link';
  url: string;
  linkTitle: string;
  linkDescription?: string;
  linkImage?: string;
  domain: string;
}

export interface File extends BaseContent {
  type: 'file';
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadCount: number;
}

export interface Article extends BaseContent {
  type: 'article';
  content: string;
  excerpt: string;
  readTime: number; // in minutes
  publishedAt?: Date;
  featuredImage?: string;
}

export type UserContent = Post | Offer | Want | Image | Link | File | Article;

export interface ContentFilter {
  type?: ContentType;
  visibility?: 'public' | 'network' | 'private';
  dateRange?: {
    start: Date;
    end: Date;
  };
  tags?: string[];
  searchQuery?: string;
}

export interface ContentStats {
  totalItems: number;
  byType: Record<ContentType, number>;
  byVisibility: {
    public: number;
    network: number;
    private: number;
  };
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}