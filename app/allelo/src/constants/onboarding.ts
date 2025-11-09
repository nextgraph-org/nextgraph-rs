import type { OnboardingState } from '@/types/onboarding';

// Onboarding step to route mapping
export const ONBOARDING_ROUTES: Record<number, string> = {
  0: '/onboarding/social-contract',
  1: '/onboarding/claim-identity',
  2: '/onboarding/welcome',
};

export const initialState: OnboardingState = {
  currentStep: 0,
  totalSteps: 3,
  isComplete: false,
};