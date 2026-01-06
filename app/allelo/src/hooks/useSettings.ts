import {useCallback, useEffect, useMemo} from "react";
import {NextGraphAuth} from "@/types/nextgraph";
import type {OnboardingState} from "@/types/onboarding.ts";
import {settingsService} from "@/services/settingsService.ts";
import {useShape} from "@ng-org/orm/react";
import {useNextGraphAuth} from "@/.auth-react/NextGraphAuthContext";
import {AppSettings} from "@/.orm/shapes/settings.typings.ts";
import {AppSettingsShapeType} from "@/.orm/shapes/settings.shapeTypes.ts";
import {getShortId, persistProperty} from "@/utils/orm/ormUtils.ts";

export interface UseSettingsReturn {
  settings: AppSettings | undefined;
  saveToStorage: (state: OnboardingState) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
}

type UpdatableSettings = Omit<AppSettings, "@graph" | "@id">;

export const useSettings = (): UseSettingsReturn => {
  const nextGraphAuth = useNextGraphAuth() || {} as NextGraphAuth;
  const {session} = nextGraphAuth;

  const scope = useMemo(() => session?.privateStoreId ? "did:ng:" + session.privateStoreId : undefined, [session]);

  const appSettingsSet = useShape(AppSettingsShapeType, scope);
  const appSettings = [...appSettingsSet][0] as AppSettings;

  useEffect(() => {
    if (!session || !session.sessionId) {
      return;
    }
    if (appSettings === undefined) {
      settingsService.isSettingsCreated(session).then((hasSettings) => {
        if (hasSettings) return;

        appSettingsSet.add({
          "@graph": scope,
          "@id": getShortId(scope!),
          "@type": new Set(["did:ng:x:settings#Settings"]),
          isOnboardingFinished: false,
          onboardingStep: 0
        } as AppSettings);
      })
    }
  }, [appSettings, appSettingsSet, scope, session]);

  const updateSettings = useCallback(async (updateData: Partial<UpdatableSettings>) => {
    try {
      if (!appSettings) {
        console.error('State is not initialized');
        return;
      }

      for (const key in updateData) {
        const propertyKey = key as keyof UpdatableSettings;
        persistProperty(propertyKey, appSettings, updateData);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }, [appSettings]);

  const saveToStorage = useCallback(async (state: OnboardingState) => {
    await updateSettings({
      onboardingStep: state.currentStep,
      isOnboardingFinished: state.isComplete,
      lnImportRequested: state.lnImportRequested
    });
  }, [updateSettings]);

  return {
    settings: appSettings,
    updateSettings,
    saveToStorage,
  };
};
