import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { FunctionComponent, PropsWithChildren } from "react";
import type { LoginOptions, SessionInfo } from "./SolidAuthContext.js";
import { SolidAuthContext, useSolidAuth } from "./SolidAuthContext.js";
import {
  getDefaultSession,
  handleIncomingRedirect,
  login as libraryLogin,
  logout as libraryLogout,
  fetch as libraryFetch,
} from "@inrupt/solid-client-authn-browser";
import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import type { SolidConnectedPlugin } from "@ldo/connected-solid";
import { createUseRootContainerFor } from "./useRootContainerFor.js";
import { createUseResource } from "@ldo/react";

const PRE_REDIRECT_URI = "PRE_REDIRECT_URI";

/**
 * Creates special react methods specific to the Solid
 * @param dataset the connectedLdoDataset with a SolidConnectedPlugin
 * @returns { BrowserSolidLdoProvider, useSolidAuth, useRootContainerFor }
 */
export function createBrowserSolidReactMethods(
  dataset: ConnectedLdoDataset<(SolidConnectedPlugin | ConnectedPlugin)[]>,
) {
  dataset.setContext("solid", { fetch: libraryFetch });

  const BrowserSolidLdoProvider: FunctionComponent<PropsWithChildren> = ({
    children,
  }) => {
    const [session, setSession] = useState<SessionInfo>(
      getDefaultSession().info,
    );
    const [ranInitialAuthCheck, setRanInitialAuthCheck] = useState(false);

    const runInitialAuthCheck = useCallback(async () => {
      if (!window.localStorage.getItem(PRE_REDIRECT_URI)) {
        window.localStorage.setItem(PRE_REDIRECT_URI, window.location.href);
      }

      await handleIncomingRedirect({
        restorePreviousSession: true,
      });
      // Set timout to ensure this happens after the redirect
      setTimeout(() => {
        setSession({ ...getDefaultSession().info });
        window.history.replaceState(
          {},
          "",
          window.localStorage.getItem(PRE_REDIRECT_URI),
        );
        window.localStorage.removeItem(PRE_REDIRECT_URI);

        setRanInitialAuthCheck(true);
      }, 0);
    }, []);

    const login = useCallback(
      async (issuer: string, options?: LoginOptions) => {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.hash = "";
        cleanUrl.search = "";
        const fullOptions = {
          redirectUrl: cleanUrl.toString(),
          clientName: "Solid App",
          oidcIssuer: issuer,
          ...options,
        };
        window.localStorage.setItem(PRE_REDIRECT_URI, window.location.href);
        await libraryLogin(fullOptions);
        setSession({ ...getDefaultSession().info });
      },
      [],
    );

    const logout = useCallback(async () => {
      await libraryLogout();
      setSession({ ...getDefaultSession().info });
    }, []);

    const signUp = useCallback(
      async (issuer: string, options?: LoginOptions) => {
        // The typings on @inrupt/solid-client-authn-core have not yet been updated
        // TODO: remove this ts-ignore when they are updated.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return login(issuer, { ...options, prompt: "create" });
      },
      [login],
    );

    useEffect(() => {
      runInitialAuthCheck();
    }, []);

    const solidAuthFunctions = useMemo(
      () => ({
        runInitialAuthCheck,
        login,
        logout,
        signUp,
        session,
        ranInitialAuthCheck,
        fetch: libraryFetch,
      }),
      [
        login,
        logout,
        ranInitialAuthCheck,
        runInitialAuthCheck,
        session,
        signUp,
      ],
    );

    return (
      <SolidAuthContext.Provider value={solidAuthFunctions}>
        {children}
      </SolidAuthContext.Provider>
    );
  };

  return {
    BrowserSolidLdoProvider,
    useSolidAuth: useSolidAuth,
    useRootContainerFor: createUseRootContainerFor(
      dataset as ConnectedLdoDataset<SolidConnectedPlugin[]>,
      createUseResource(dataset as ConnectedLdoDataset<ConnectedPlugin[]>),
    ),
  };
}
