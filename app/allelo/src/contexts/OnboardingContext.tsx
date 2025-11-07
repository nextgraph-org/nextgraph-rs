import {useState, useRef, useEffect, useCallback} from 'react';
import type {ReactNode} from 'react';
import type {OnboardingState, OnboardingContextType} from '@/types/onboarding';
import {OnboardingContext} from '@/contexts/OnboardingContextType';
import {initialState} from '@/constants/onboarding';
import {useNextGraphAuth} from '@/lib/nextgraph';
import type {NextGraphAuth} from '@/types/nextgraph';
import {useSettings} from '@/hooks/useSettings';

export const OnboardingProvider = ({children}: { children: ReactNode }) => {
  const nextGraphAuth = useNextGraphAuth() as unknown as NextGraphAuth | undefined;
  const isAuthenticated = Boolean(nextGraphAuth?.session?.sessionId);

  const {settings, saveToStorage} = useSettings();

  const [state, setState] = useState<OnboardingState>(initialState);

  const hasBeenAuthenticated = useRef(false);
  if (isAuthenticated) {
    hasBeenAuthenticated.current = true;
  }

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!hasInitialized.current && settings && settings.onboardingStep !== undefined) {
      setState({
        currentStep: settings.onboardingStep,
        totalSteps: initialState.totalSteps,
        isComplete: settings.isOnboardingFinished ?? false,
      });
      hasInitialized.current = true;
    }
  }, [settings]);

  const isInitialized = hasInitialized.current;

  const nextStep = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        currentStep: Math.min(prevState.currentStep + 1, prevState.totalSteps - 1),
      };

      if (hasBeenAuthenticated.current) {
        saveToStorage(newState);
      }

      return newState;
    });
  }, [saveToStorage]);

  const completeOnboarding = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        isComplete: true,
      };

      // Save only if authenticated
      if (hasBeenAuthenticated.current) {
        saveToStorage(newState);
      }

      return newState;
    });
  }, [saveToStorage]);

  const value: OnboardingContextType = {
    state,
    isInitialized,
    nextStep,
    completeOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};