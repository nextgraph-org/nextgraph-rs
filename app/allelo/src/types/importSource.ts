import React from "react";
import {SvgIconOwnProps} from "@mui/material";
import {SocialContact} from "@/.orm/shapes/contact.typings.ts";

export type SourceRunnerProps = {
  open: boolean;
  onGetResult: (contacts?: SocialContact[], callback?: () => void) => void;
  onClose: () => void;
  onError: (e: unknown) => void;
};

export interface ImportSourceConfig {
  name: string;
  type: string;
  icon?: React.ReactElement<SvgIconOwnProps>;
  description: string;
  isAvailable: boolean;
  customButtonName?: string;
  Runner?: React.ComponentType<SourceRunnerProps>;
}