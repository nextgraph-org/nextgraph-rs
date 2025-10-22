import { useReducer } from 'react';
import type { ReactNode } from 'react';
import type { OnboardingState, OnboardingContextType, UserProfile } from '@/types/onboarding';
import { OnboardingContext } from '@/contexts/OnboardingContextType';
import { initialState } from '@/constants/onboarding';

type OnboardingAction =
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'CONNECT_ACCOUNT'; payload: string }
  | { type: 'DISCONNECT_ACCOUNT'; payload: string }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'RESET' };

const onboardingReducer = (state: OnboardingState, action: OnboardingAction): OnboardingState => {
  switch (action.type) {
    case 'UPDATE_PROFILE':
      return {
        ...state,
        userProfile: { ...state.userProfile, ...action.payload },
      };
    
    case 'CONNECT_ACCOUNT':
      return {
        ...state,
        connectedAccounts: state.connectedAccounts.map(account =>
          account.id === action.payload
            ? { ...account, isConnected: true, connectedAt: new Date() }
            : account
        ),
      };
    
    case 'DISCONNECT_ACCOUNT':
      return {
        ...state,
        connectedAccounts: state.connectedAccounts.map(account =>
          account.id === action.payload
            ? { ...account, isConnected: false, connectedAt: undefined }
            : account
        ),
      };
    
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, state.totalSteps - 1),
      };
    
    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
      };
    
    case 'COMPLETE_ONBOARDING':
      return {
        ...state,
        isComplete: true,
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
};


export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  const updateProfile = (profile: Partial<UserProfile>) => {
    dispatch({ type: 'UPDATE_PROFILE', payload: profile });
  };

  const connectAccount = (accountId: string) => {
    dispatch({ type: 'CONNECT_ACCOUNT', payload: accountId });
  };

  const disconnectAccount = (accountId: string) => {
    dispatch({ type: 'DISCONNECT_ACCOUNT', payload: accountId });
  };

  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  const prevStep = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  const completeOnboarding = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
  };

  const value: OnboardingContextType = {
    state,
    updateProfile,
    connectAccount,
    disconnectAccount,
    nextStep,
    prevStep,
    completeOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

