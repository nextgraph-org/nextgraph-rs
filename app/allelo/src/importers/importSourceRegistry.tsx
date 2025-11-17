import {GmailSourceConfig} from "@/importers/gmail/GmailSourceConfig";
import {ContactsSourceConfig} from "@/importers/android/ContactsSourceConfig";
import {ImportSourceConfig} from "@/types/importSource";
import {MockDataSourceConfig} from "@/importers/mock/MockDataSourceConfig";
import {LinkedInSourceConfig} from "@/importers/linkedin/LinkedInSourceConfig";
import {VCFSourceConfig} from "@/importers/vcf/VCFSourceConfig";

export class ImportSourceRegistry {
  private static configs: Record<string, ImportSourceConfig> = {
    contacts: ContactsSourceConfig,
    gmail: GmailSourceConfig,
    linkedin: LinkedInSourceConfig,
    vcf: VCFSourceConfig,
    // mockdata: MockDataSourceConfig
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
    if (import.meta.env.NG_PUBLIC_DEV) {
      this.configs.mockdata = MockDataSourceConfig;
    }
    return Object.values(this.configs);
  }
}