import type { OnboardingState } from '@/types/onboarding';

export const initialState: OnboardingState = {
  currentStep: 0,
  totalSteps: 2,
  userProfile: {},
  connectedAccounts: [
    {
      id: 'linkedin',
      type: 'linkedin',
      name: 'LinkedIn',
      isConnected: false,
    },
    {
      id: 'contacts',
      type: 'contacts',
      name: 'Contacts',
      isConnected: false,
    },
    {
      id: 'google',
      type: 'google',
      name: 'Google',
      isConnected: false,
    },
    {
      id: 'apple',
      type: 'apple',
      name: 'Apple',
      isConnected: false,
    },
  ],
  isComplete: false,
};