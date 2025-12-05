import { UilEnvelope as MailOutline } from '@iconscout/react-unicons';
import {ImportSourceConfig} from "@/types/importSource";
import {GmailRunner} from "./GmailRunner";

export const GmailSourceConfig: ImportSourceConfig = {
  name: 'Gmail',
  type: 'gmail',
  icon: <MailOutline size="40" />,
  description: 'Import Gmail contacts',
  isAvailable: true,
  Runner: GmailRunner,
};
