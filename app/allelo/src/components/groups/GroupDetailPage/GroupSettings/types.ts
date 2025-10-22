import type { Group } from '@/types/group';

export interface GroupSettingsProps {
  group: Group | null;
  onUpdateGroup: (updates: Partial<Group>) => void;
  isLoading?: boolean;
}