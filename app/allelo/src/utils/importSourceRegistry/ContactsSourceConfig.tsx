import {PhoneAndroid} from '@mui/icons-material';
import {isTauri} from '@tauri-apps/api/core';

import {ImportSourceConfig,} from '@/types/importSource';
import {ContactsRunner} from "@/utils/importSourceRegistry/ContactsRunner";

export const ContactsSourceConfig: ImportSourceConfig = {
  name: 'Mobile contacts',
  type: 'contacts',
  icon: <PhoneAndroid/>,
  description: 'Import from your phone\'s contacts',
  isAvailable: isTauri(), //TODO: could be improved if we need desktop also
  customButtonName: "Import from Phone",
  Runner: ContactsRunner
};
