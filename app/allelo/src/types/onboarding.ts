export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  position?: string;
  bio?: string;
  groupIds?: string[];
}

export interface ConnectedAccount {
  id: string;
  type: 'linkedin' | 'contacts' | 'google' | 'apple';
  name: string;
  email?: string;
  isConnected: boolean;
  connectedAt?: Date;
}

export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  userProfile: Partial<UserProfile>;
  connectedAccounts: ConnectedAccount[];
  isComplete: boolean;
}

export interface OnboardingContextType {
  state: OnboardingState;
  updateProfile: (profile: Partial<UserProfile>) => void;
  connectAccount: (accountId: string) => void;
  disconnectAccount: (accountId: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeOnboarding: () => void;
}