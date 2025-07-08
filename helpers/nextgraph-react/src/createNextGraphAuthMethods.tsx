import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { FunctionComponent, PropsWithChildren } from "react";
import { NextGraphAuthContext, useNextGraphAuth } from "./NextGraphAuthContext.js";
import type { NextGraphConnectedContext } from "@ldo/connected-nextgraph";
import {default as ng, init} from "nextgraphweb";

/**
 * Creates special react methods specific to the NextGraph Auth
 * @returns { BrowserNextGraphAuth, useNextGraphAuth }
 */
export function createNextGraphAuthMethod () {

  const NextGraphAuthMethod: FunctionComponent<PropsWithChildren> = ({
    children,
  }) => {
    const [session, setSession] = useState<NextGraphConnectedContext>(
      {
        ng: undefined,
      }
    );
    const [ranInitialAuthCheck, setRanInitialAuthCheck] = useState(false);

    const runInitialAuthCheck = useCallback(async () => {
      //console.log("runInitialAuthCheck called", ranInitialAuthCheck)
      if (ranInitialAuthCheck) return;

      //console.log("init called");
      setRanInitialAuthCheck(true);
      // TODO: export the types for the session object coming from NG.
      await init( (event: { status: string; session: { session_id: unknown; protected_store_id: unknown; private_store_id: unknown; public_store_id: unknown; }; }) => {
        //console.log("called back in react", event)
        
        // callback
        // once you receive event.status == "loggedin"
        // you can use the full API
        if (event.status == "loggedin") {
          setSession({ 
            ng, 
            sessionId: event.session.session_id as string, //FIXME: sessionId should be a Number.
            protectedStoreId: event.session.protected_store_id as string,
            privateStoreId: event.session.private_store_id as string,
            publicStoreId: event.session.public_store_id as string
          }); // TODO: add event.session.user too

        }
        else if (event.status == "cancelled" || event.status == "error" || event.status == "loggedout") {
          setSession({ ng: undefined });
        }
      }
      , true // singleton: boolean (will your app create many docs in the system, or should it be launched as a unique instance)
      , []); //list of AccessRequests (for now, leave this empty)
      
    }, []);
      

    const login = useCallback(
      async () => {
        await ng.login();
      },
      [],
    );

    const logout = useCallback(async () => {
      await ng.logout();
    }, []);

    useEffect(() => {
      runInitialAuthCheck();
    }, []);

    const nextGraphAuthFunctions = useMemo(
      () => ({
        runInitialAuthCheck,
        login,
        logout,
        session,
        ranInitialAuthCheck,
      }),
      [
        login,
        logout,
        ranInitialAuthCheck,
        runInitialAuthCheck,
        session,
      ],
    );

    return (
      <NextGraphAuthContext.Provider value={nextGraphAuthFunctions}>
        {children}
      </NextGraphAuthContext.Provider>
    );
  };

  return {
      NextGraphAuthMethod,
      useNextGraphAuth: useNextGraphAuth
    };
};