import { ONBOARDING_ROUTES } from '@/constants/onboarding';

/**
 * Get the route path for a given onboarding step
 * @param step - The current onboarding step number
 * @returns The route path for the step, or null if step is invalid
 */
export const getOnboardingRouteFromStep = (step: number): string | null => {
  return ONBOARDING_ROUTES[step] || null;
};

/**
 * Determine where to redirect based on onboarding completion status
 * @param isComplete - Whether onboarding is complete
 * @param currentStep - The current onboarding step
 * @returns The redirect path, or null if no redirect is needed (user can access main app)
 */
export const getOnboardingRedirectPath = (
  isComplete: boolean,
  currentStep: number
): string | null => {
  if (isComplete) {
    return null;
  }

  return getOnboardingRouteFromStep(currentStep);
};