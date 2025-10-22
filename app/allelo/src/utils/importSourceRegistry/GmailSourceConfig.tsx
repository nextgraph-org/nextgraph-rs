import { MailOutline } from '@mui/icons-material';
import {ImportSourceConfig} from "@/types/importSource.ts";
import {GmailRunner} from "@/utils/importSourceRegistry/GmailRunner.tsx";

export const GmailSourceConfig: ImportSourceConfig = {
  name: 'Gmail',
  type: 'gmail',
  icon: <MailOutline />,
  description: 'Import Gmail contacts',
  isAvailable: true,
  Runner: GmailRunner,
};
