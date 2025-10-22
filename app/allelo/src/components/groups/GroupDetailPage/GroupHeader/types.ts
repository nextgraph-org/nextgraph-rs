import type { Group } from '@/types/group';

export interface GroupHeaderProps {
  group: Group | null;
  isLoading: boolean;
  onBack: () => void;
  onInvite: () => void;
  onStartAIAssistant: (prompt?: string) => void;
  onStartTour: () => void;
}