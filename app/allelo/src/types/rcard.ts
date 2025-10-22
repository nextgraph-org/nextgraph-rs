export type RCardType = 'Friends' | 'Family' | 'Community' | 'Business';

export interface RCard {
  id: string;
  type: RCardType;
  name: string;
  description?: string;
  memberCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RCardAssignment {
  cardType: RCardType;
  assignedAt: Date;
  assignedBy?: string;
}