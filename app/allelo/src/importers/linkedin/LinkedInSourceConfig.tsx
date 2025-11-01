import {LinkedIn} from "@mui/icons-material";
import {ImportSourceConfig} from "@/types/importSource";
import {LinkedInRunner} from "./LinkedInRunner";

export const LinkedInSourceConfig: ImportSourceConfig = {
  name: 'LinkedIn',
  type: 'linkedin',
  icon: <LinkedIn/>,
  description: 'Import your LinkedIn connections',
  isAvailable: true,
  Runner: LinkedInRunner
};