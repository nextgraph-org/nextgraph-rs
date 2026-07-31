import React from "react";
import { NgComponentContext } from "@ng-org/frontend";

export const ReactComponentContext = React.createContext<
  NgComponentContext | undefined
>(undefined);
