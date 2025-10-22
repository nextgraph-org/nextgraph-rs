import { createContext } from 'react';
import type { OnboardingContextType } from '@/types/onboarding';

export const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);