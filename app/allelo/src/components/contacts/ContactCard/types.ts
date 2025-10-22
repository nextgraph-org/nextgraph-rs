import type { Contact } from '@/types/contact';

export interface BaseContactCardProps {
  contact: Contact;
  nuri: string;
  isSelectionMode: boolean;
  isMultiSelectMode: boolean;
  isSelected: boolean;
  isMerged: boolean;
  onSelectContact: (contactId: string) => void;
}

export interface IconHelpers {
  getSourceIcon: (source: string) => React.ReactNode;
  getNaoStatusIcon: (naoStatus?: string) => React.ReactNode;
  getCategoryIcon: (category?: string) => React.ReactNode;
  getRelationshipCategoryInfo: (category?: string) => { 
    name: string; 
    icon: React.ReactNode; 
    color: string; 
  } | null;
}

export interface VouchPraiseCounts {
  vouchesSent: number;
  vouchesReceived: number;
  praisesSent: number;
  praisesReceived: number;
}