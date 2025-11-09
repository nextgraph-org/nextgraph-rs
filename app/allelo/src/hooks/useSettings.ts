import {useCallback, useEffect, useState} from "react";
import {isNextGraphEnabled} from "@/utils/featureFlags";
import {useLdo, useNextGraphAuth, useResource, useSubject} from "@/lib/nextgraph";
import {NextGraphAuth} from "@/types/nextgraph";
import {AppSettings} from "@/.ldo/settings.typings.ts";
import {AppSettingsShapeType} from "@/.ldo/settings.shapeTypes.ts";
import type {OnboardingState} from "@/types/onboarding.ts";
import {nextgraphDataService} from "@/services/nextgraphDataService.ts";


export const useSettings = () => {
  const {commitData, changeData} = useLdo();

  const [settings, setSettings] = useState<AppSettings | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isNextGraph = isNextGraphEnabled();
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;
  const sessionId = session?.sessionId;

  let nuri;
  if (session?.privateStoreId) {
    nuri = "did:ng:" + session.privateStoreId;
  }

  // NextGraph subscription
  const resource = useResource(sessionId && nuri ? nuri : undefined, {subscribe: true});

  const appSettings: AppSettings | undefined = useSubject(
    AppSettingsShapeType,
    sessionId && nuri ? nuri.substring(0, 53) : undefined
  );

  const saveToStorage = useCallback(async (state: OnboardingState) => {
    try {
      const hasSettings = await nextgraphDataService.isSettingsCreated(session);
      if (!hasSettings) {
        await nextgraphDataService.createSettings(session);
      }

      const settings: Partial<AppSettings> = {}
      if (state.currentStep) {
        settings.onboardingStep = state.currentStep;
      }
      if (state.isComplete) {
        settings.isOnboardingFinished = state.isComplete;
      }
      if (state.lnImportRequested) {
        settings.lnImportRequested = state.lnImportRequested;
      }

      await nextgraphDataService.updateSettings(session, settings, changeData, commitData);
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }, [changeData, commitData, session]);


  const updateSettings = useCallback(async () => {
    if (!session || !session.sessionId) {
      return;
    }
    const hasSettings = await nextgraphDataService.isSettingsCreated(session);
    if (!hasSettings) {
      await nextgraphDataService.createSettings(session);
      const settings: Partial<AppSettings> = {
        isOnboardingFinished: false,
        onboardingStep: 0,
      }
      await nextgraphDataService.updateSettings(session, settings, changeData, commitData);
    }
    if (appSettings?.onboardingStep !== undefined) {
      setSettings(appSettings);
      setIsLoading(false);
      setError(null);
    }
  }, [appSettings, changeData, commitData, session])


  useEffect(() => {
    if (!isNextGraph) {
      setSettings(undefined);
      setIsLoading(false);
      setError(null);
    } else {
      updateSettings();
    }
  }, [isNextGraph, updateSettings, appSettings]);

  return {settings, isLoading, error, setSettings, resource, saveToStorage};
};
