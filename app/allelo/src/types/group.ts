export interface Group {
  id: string;
  name: string;
  description?: string;
  type?: 'Public' | 'Private' | 'Invite Only';
  memberCount: number;
  memberIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isPrivate: boolean;
  tags?: string[];
  image?: string;
  latestPost?: string;
  latestPostAuthor?: string;
  latestPostAt?: Date;
  unreadCount?: number;
}

export interface GroupMember {
  userId: string;
  groupId: string;
  joinedAt: Date;
  role: 'admin' | 'member' | 'moderator';
}

export interface GroupPost {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  comments: number;
  attachments?: string[];
  images?: string[];
}

export interface GroupLink {
  id: string;
  groupId: string;
  title: string;
  url: string;
  description?: string;
  sharedBy: string;
  sharedByName: string;
  sharedAt: Date;
  tags?: string[];
}