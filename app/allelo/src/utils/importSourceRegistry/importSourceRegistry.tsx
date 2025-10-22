import {LinkedIn} from "@mui/icons-material";
import {GmailSourceConfig} from "@/utils/importSourceRegistry/GmailSourceConfig";
import {ContactsSourceConfig} from "@/utils/importSourceRegistry/ContactsSourceConfig";
import {ImportSourceConfig} from "@/types/importSource";
import {MockDataSourceConfig} from "@/utils/importSourceRegistry/MockDataSourceConfig";

export class ImportSourceRegistry {
  private static configs: Record<string, ImportSourceConfig> = {
    contacts: ContactsSourceConfig,
    gmail: GmailSourceConfig,
    linkedin: {
      name: 'LinkedIn',
      type: 'linkedin',
      icon: <LinkedIn/>,
      description: 'Import your LinkedIn connections',
      isAvailable: true
    },
    mockdata: MockDataSourceConfig
  };

  static getConfig(id: string): ImportSourceConfig | undefined {
    return this.configs[id];
  }

  static getName(id: string): string {
    return this.configs[id]?.name || id;
  }

  static getIcon(id: string) {
    const config = this.configs[id];
    return config?.icon;
  }

  static getDescription(id: string): string {
    return this.configs[id]?.description || '';
  }

  static isAvailable(id: string): boolean {
    return this.configs[id]?.isAvailable || false;
  }

  static registerSource(id: string, config: ImportSourceConfig): void {
    this.configs[id] = config;
  }

  static getAllSources(): ImportSourceConfig[] {
    return Object.values(this.configs);
  }
}