interface Vouch {
  id: string;
  giver: string;
  receiver: string;
  message: string;
  timestamp: Date;
  type: 'vouch' | 'praise';
  tags?: string[];
}

export interface GroupVouchesProps {
  vouches: Vouch[];
  onCreateVouch: (vouch: Omit<Vouch, 'id' | 'timestamp'>) => void;
  isLoading?: boolean;
}