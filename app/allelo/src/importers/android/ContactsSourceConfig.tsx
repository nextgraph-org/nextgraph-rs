import {UilMobileAndroid as PhoneAndroid} from '@iconscout/react-unicons';

import {ImportSourceConfig,} from '@/types/importSource';
import {ContactsRunner} from "./ContactsRunner";

const isMobile = import.meta.env.TAURI_ENV_PLATFORM == "android" || import.meta.env.TAURI_ENV_PLATFORM == "ios";

export const ContactsSourceConfig: ImportSourceConfig = {
  name: 'Mobile contacts',
  type: 'contacts',
  icon: <PhoneAndroid size="40"/>,
  description: 'Import from your phone\'s contacts',
  isAvailable: isMobile,
  customButtonName: "Import from Phone",
  Runner: ContactsRunner
};
