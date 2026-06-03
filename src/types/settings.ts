export interface PluginSettings {
  vaults: VaultConfig[];
  scan: ScanSettings;
  ignore: IgnoreSettings;
  templates: TemplateSettings;
  ui: UISettings;
  version: number;
}

export interface VaultConfig {
  id: string;
  name: string;
  path: string;
  addedAt: number;
  isEnabled: boolean;
  templateFolder?: string;
  defaultFolder?: string;
  ignorePatterns: string[];
}

export interface ScanSettings {
  frequency: 'realtime' | '30s' | '60s' | '5min' | 'manual';
  incrementalOnly: boolean;
  maxFileSize: number;
  fileTypes: {
    enabled: string[];
  };
  autoScanOnFocus: boolean;
}

export interface IgnoreSettings {
  patterns: string[];
  ignoreDotFiles: boolean;
}

export interface TemplateSettings {
  defaultTemplates: Record<string, string>;
  defaultFolders: Record<string, string>;
}

export interface UISettings {
  showTagCloud: boolean;
  showHealthScore: boolean;
  showEmbedRef: boolean;
  maxRecentItems: number;
  compactMode: boolean;
  searchHistory: string[];
  debug: boolean;
  modules: {
    stats: boolean;
    tasks: boolean;
    recent: boolean;
    weekly: boolean;
    health: boolean;
    suggestions: boolean;
    embed: boolean;
    otherVaults: boolean;
    orphans: boolean;
  };
}
