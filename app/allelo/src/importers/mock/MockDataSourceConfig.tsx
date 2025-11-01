import {ImportSourceConfig} from "@/types/importSource";
import { UilCloudDownload as CloudDownload } from "@iconscout/react-unicons";
import {MockDataRunner} from "./MockDataRunner";

export const MockDataSourceConfig: ImportSourceConfig = {
  name: 'Mock Data',
  type: 'mockdata',
  icon: <CloudDownload size="20"/>,
  description: 'Import sample contacts for testing',
  isAvailable: true,
  Runner: MockDataRunner
};
