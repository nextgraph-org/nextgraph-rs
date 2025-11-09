import {useState, useRef, useEffect, useCallback} from 'react';
import type {ReactNode} from 'react';
import type {OnboardingState, OnboardingContextType} from '@/types/onboarding';
import {OnboardingContext} from '@/contexts/OnboardingContextType';
import {initialState} from '@/constants/onboarding';
import {useSettings} from '@/hooks/useSettings';

export const OnboardingProvider = ({children}: { children: ReactNode }) => {
  const {settings, saveToStorage} = useSettings();

  const [state, setState] = useState<OnboardingState>(initialState);

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
        currentStep: Math.min((prevState.currentStep || 0) + 1, (prevState.totalSteps || 3) - 1),
      };

      saveToStorage(newState);

      return newState;
    });
  }, [saveToStorage]);

  const completeOnboarding = useCallback(() => {
    setState(prevState => {
      const newState = {
        ...prevState,
        isComplete: true,
      };

      saveToStorage(newState);

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