import {ImportSourceConfig} from "@/types/importSource.ts";
import { CloudDownload } from "@mui/icons-material";
import {MockDataRunner} from "@/utils/importSourceRegistry/MockDataRunner.tsx";

export const MockDataSourceConfig: ImportSourceConfig = {
  name: 'Mock Data',
  type: 'mockdata',
  icon: <CloudDownload/>,
  description: 'Import sample contacts for testing',
  isAvailable: true,
  Runner: MockDataRunner
};
