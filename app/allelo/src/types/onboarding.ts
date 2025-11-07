export interface OnboardingState {
  currentStep?: number;
  totalSteps?: number;
  isComplete?: boolean;
  lnImportRequested?: boolean
}

export interface OnboardingContextType {
  state: OnboardingState;
  isInitialized: boolean;
  nextStep: () => void;
  completeOnboarding: () => void;
}