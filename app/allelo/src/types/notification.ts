export interface ProfileCard {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Legacy alias for backwards compatibility
export type RCard = ProfileCard;

export interface Vouch {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserId: string;
  skill: string;
  description: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  endorsementText?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Praise {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar?: string;
  toUserId: string;
  category: 'professional' | 'personal' | 'leadership' | 'teamwork' | 'communication' | 'creativity' | 'other';
  title: string;
  description: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationAction {
  id: string;
  type: 'accept' | 'reject' | 'assign' | 'view' | 'select_rcard';
  label: string;
  variant?: 'text' | 'outlined' | 'contained';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
}

export interface Notification {
  id: string;
  type: 'vouch' | 'praise' | 'connection' | 'group_invite' | 'message' | 'system';
  title: string;
  message: string;
  fromUserId?: string;
  fromUserName?: string;
  fromUserAvatar?: string;
  targetUserId: string;
  isRead: boolean;
  isActionable: boolean;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  actions?: NotificationAction[];
  metadata?: {
    vouchId?: string;
    praiseId?: string;
    groupId?: string;
    messageId?: string;
    profileCardId?: string;
    rCardId?: string; // Legacy alias
    rCardIds?: string[]; // Multiple rCard assignments
    contactId?: string;
    selectedRCardId?: string;
    selectedRCardIds?: string[]; // Multiple selections
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface VouchNotification extends Notification {
  type: 'vouch';
  metadata: {
    vouchId: string;
    profileCardId?: string;
    rCardId?: string; // Legacy alias
  };
}

export interface PraiseNotification extends Notification {
  type: 'praise';
  metadata: {
    praiseId: string;
    profileCardId?: string;
    rCardId?: string; // Legacy alias
  };
}

export interface ConnectionNotification extends Notification {
  type: 'connection';
  metadata: {
    contactId: string;
    selectedRCardId?: string;
  };
}

export interface NotificationSummary {
  total: number;
  unread: number;
  pending: number;
  byType: {
    vouch: number;
    praise: number;
    connection: number;
    group_invite: number;
    message: number;
    system: number;
  };
}

export type PrivacyLevel = 'none' | 'limited' | 'moderate' | 'intimate';
export type LocationSharingLevel = 'never' | 'limited' | 'always';

export interface PrivacySettings {
  keyRecoveryBuddy: boolean;
  locationSharing: LocationSharingLevel;
  locationDeletionHours: number;
  dataSharing: {
    posts: boolean;
    offers: boolean;
    wants: boolean;
    vouches: boolean;
    praise: boolean;
  };
  reSharing: {
    enabled: boolean;
    maxHops: number;
  };
}

export interface ProfileCardWithPrivacy extends ProfileCard {
  privacySettings: PrivacySettings;
}

// Legacy alias for backwards compatibility
export type RCardWithPrivacy = ProfileCardWithPrivacy;

export interface ContactPrivacyOverride {
  contactId: string;
  profileCardId: string;
  rCardId?: string; // Legacy alias
  overrides: Partial<PrivacySettings>;
  createdAt: Date;
  updatedAt: Date;
}

// Default privacy settings template
export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  keyRecoveryBuddy: false,
  locationSharing: 'never',
  locationDeletionHours: 8,
  dataSharing: {
    posts: true,
    offers: true,
    wants: true,
    vouches: true,
    praise: true,
  },
  reSharing: {
    enabled: true,
    maxHops: 3,
  },
};

// Default profile card categories
export const DEFAULT_PROFILE_CARDS: Omit<ProfileCard, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Default',
    description: 'Connections not allocated to another card',
    color: '#6b7280',
    icon: 'PersonOutline',
    isDefault: true,
  },
  {
    name: 'Friends',
    description: 'Personal friends and social connections',
    color: '#ef4444',
    icon: 'Favorite',
    isDefault: true,
  },
  {
    name: 'Family',
    description: 'Family members and relatives',
    color: '#f59e0b',
    icon: 'FamilyRestroom',
    isDefault: true,
  },
  {
    name: 'Business',
    description: 'Professional business contacts and partnerships',
    color: '#2563eb',
    icon: 'Business',
    isDefault: true,
  },
  {
    name: 'Community',
    description: 'Community members and local connections',
    color: '#059669',
    icon: 'Public',
    isDefault: true,
  },
];

// Legacy alias for backwards compatibility
export const DEFAULT_RCARDS = DEFAULT_PROFILE_CARDS;