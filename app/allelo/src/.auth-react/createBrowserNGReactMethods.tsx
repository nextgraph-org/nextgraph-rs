// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck deal with it later
import React, { useCallback, useEffect, useMemo, useState } from "react";
//import { useNavigate, useLocation } from "react-router-dom";
import type { FunctionComponent, PropsWithChildren } from "react";
import { NextGraphAuthContext, useNextGraphAuth } from "./NextGraphAuthContext.js";

import { default as ng, init_api} from "./api";
import {ng as ng3, init} from "@ng-org/web";
import { initNg } from "@ng-org/orm";

import type { ConnectedLdoDataset, ConnectedPlugin } from "@ldo/connected";
import type { NextGraphConnectedPlugin, NextGraphConnectedContext } from "@ldo/connected-nextgraph";

/**
 * Creates special react methods specific to the NextGraph Auth
 * @param dataset the connectedLdoDataset with a nextGraphConnectedPlugin
 * @returns { BrowserNGLdoProvider, useNextGraphAuth }
 */
export function createBrowserNGReactMethods(
  dataset: ConnectedLdoDataset<(NextGraphConnectedPlugin | ConnectedPlugin)[]>,
) : {BrowserNGLdoProvider: React.FunctionComponent<{children?: React.ReactNode | undefined}>, useNextGraphAuth: typeof useNextGraphAuth} {
  
  const BrowserNGLdoProvider: FunctionComponent<PropsWithChildren> = ({
    children,
  }) => {
    //const navigate = useNavigate();
    //const location = useLocation();
    const [session, setSession] = useState<NextGraphConnectedContext>(
      {
        ng: undefined,
      }
    );
    const [ranInitialAuthCheck, setRanInitialAuthCheck] = useState(false);

    const runInitialAuthCheck = useCallback(async () => {
      //console.log("runInitialAuthCheck called", ranInitialAuthCheck)
      if (ranInitialAuthCheck) return;

      console.log("init called", import.meta.env.NG_ENV_WEB);
      setRanInitialAuthCheck(true);
      // TODO: export the types for the session object coming from NG.

      if (import.meta.env.NG_ENV_WEB == 3) {
        console.log("NG_ENV_WEB 3 init called");
        await init( (event: 
          { status: string; 
            session: { session_id: unknown; 
                        protected_store_id: unknown; 
                        private_store_id: unknown; 
                        public_store_id: unknown; }; 
            }) => {
          //console.log("called back in react", event)
          init_api(ng3);
          // callback
          // once you receive event.status == "loggedin"
          // you can use the full API
          if (event.status == "loggedin") {
            setSession({ 
              ng: ng3, 
              sessionId: event.session.session_id as string, //FIXME: sessionId should be a Number.
              protectedStoreId: event.session.protected_store_id as string,
              privateStoreId: event.session.private_store_id as string,
              publicStoreId: event.session.public_store_id as string
            }); // TODO: add event.session.user too

            dataset.setContext("nextgraph", {
              ng: ng3,
              sessionId: event.session.session_id as string
            });

            initNg(ng, event.session);
            window.location.hash = "#/";
          }
          else if (event.status == "cancelled" || event.status == "error" || event.status == "loggedout") {
            setSession({ ng: undefined });
            dataset.setContext("nextgraph", {
              ng: undefined,
            });
          }
        }
        , true // singleton: boolean (will your app create many docs in the system, or should it be launched as a unique instance)
        , []); //list of AccessRequests (for now, leave this empty)

      } else {

        window.login_callback = 
        (event: 
          { status: string; 
            session: { session_id: unknown; 
                      protected_store_id: unknown; 
                      private_store_id: unknown; 
                      public_store_id: unknown; }; 
          }) => {
            console.log("called back in react", event)
            
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

              dataset.setContext("nextgraph", {
                ng,
                sessionId: event.session.session_id as string
              });

              initNg(ng, event.session);
            }
            else if (event.status == "cancelled" || event.status == "error" || event.status == "loggedout") {
              setSession({ ng: undefined });
              dataset.setContext("nextgraph", {
                ng: undefined,
              });
            }
          };
        //console.log("login_callback set");
      }

      
      //if (!location.pathname.startsWith("/wallet/create") && !location.pathname.startsWith("/i") ) navigate("/wallet/login")
      
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
    BrowserNGLdoProvider,
    useNextGraphAuth: useNextGraphAuth
  };
};