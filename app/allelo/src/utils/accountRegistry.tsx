import React from 'react';
import { LinkedIn, GitHub, Twitter, Telegram, WhatsApp } from "@mui/icons-material";
import { SvgIconOwnProps, Theme } from "@mui/material";
import { SxProps } from "@mui/material/styles";

interface AccountConfig {
  label: string;
  icon?: React.ReactElement<SvgIconOwnProps>;
  color?: string;
  linkTemplate?: (accountName: string) => string;
}

export class AccountRegistry {
  private static configs: Record<string, AccountConfig> = {
    linkedin: {
      label: 'LinkedIn',
      icon: <LinkedIn/>,
      color: '#0077b5',
      linkTemplate: (accountName: string) => `https://linkedin.com/in/${accountName}`
    },
    github: {
      label: 'GitHub',
      icon: <GitHub/>,
      color: '#333333',
      linkTemplate: (accountName: string) => `https://github.com/${accountName}`
    },
    twitter: {
      label: 'Twitter',
      icon: <Twitter/>,
      color: '#1da1f2',
      // linkTemplate: (accountName: string) => `https://twitter.com/${accountName}`
    },
    telegram: {
      label: 'Telegram',
      icon: <Telegram/>,
      color: '#0088cc',
      linkTemplate: (accountName: string) => `https://t.me/${accountName}`
    },
    whatsapp: {
      label: 'WhatsApp',
      icon: <WhatsApp/>,
      color: '#25d366',
      // linkTemplate: (accountName: string) => `https://wa.me/${accountName}`
    },
    signal: {
      label: 'Signal',
      color: '#3a76f0'
    }
  };

  static getConfig(protocol: string): AccountConfig | undefined {
    return this.configs[protocol];
  }

  static getLabel(protocol: string): string {
    return this.configs[protocol]?.label || protocol;
  }

  static getIcon(protocol: string, sx?: SxProps<Theme>): React.ReactElement | undefined {
    const config = this.configs[protocol];
    if (!config?.icon) return undefined;
    sx ??= {mr: 2, color: config.color || '#0077b5'};

    return React.cloneElement(config.icon, {
      sx
    });
  }

  static getLink(protocol: string, accountName: string): string | undefined {
    const config = this.configs[protocol];
    if (config?.linkTemplate) {
      return config.linkTemplate(accountName);
    }
  }

  static registerAccount(protocol: string, config: AccountConfig): void {
    this.configs[protocol] = config;
  }

  static getAllProtocols = () => Object.keys(this.configs);

  static getAllAccountTypes(): Array<{ protocol: string, label: string, icon?: React.ReactElement<SvgIconOwnProps> }> {
    return Object.entries(this.configs).map(([protocol, config]) => ({
      protocol,
      label: config.label,
      icon: config.icon
    }));
  }
}