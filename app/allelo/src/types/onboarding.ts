export interface OnboardingState {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
}

export interface OnboardingContextType {
  state: OnboardingState;
  isInitialized: boolean;
  nextStep: () => void;
  completeOnboarding: () => void;
}