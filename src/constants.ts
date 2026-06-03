import type { PluginSettings } from './types/settings';

export const PLUGIN_NAME = 'vault-commander';
export const VIEW_TYPE_DASHBOARD = 'vault-commander-dashboard';

export const DEFAULT_SETTINGS: PluginSettings = {
  vaults: [],
  scan: {
    frequency: '60s',
    incrementalOnly: true,
    maxFileSize: 10 * 1024 * 1024,
    fileTypes: {
      enabled: ['.md'],
    },
    autoScanOnFocus: true,
  },
  ignore: {
    patterns: ['.git', 'node_modules', '.obsidian', '_attachments', '*.exe'],
    ignoreDotFiles: true,
  },
  templates: {
    defaultTemplates: {},
    defaultFolders: {},
    customTemplates: [
      {
        name: '任务记录',
        content: '---\ntags:\n  - task\ncreated: {{date}}\n---\n\n# {{title}}\n\n## 目标\n\n- [ ] \n\n## 备注\n\n',
      },
      {
        name: '灵感记录',
        content: '---\ntags:\n  - idea\ncreated: {{date}}\n---\n\n# {{title}}\n\n## 来源\n\n## 想法\n\n## 行动\n\n- [ ] \n',
      },
      {
        name: '小日记',
        content: '---\ntags:\n  - diary\ncreated: {{date}}\n---\n\n# {{title}}\n\n## 今日记录\n\n## 思考\n\n## 明日计划\n\n- [ ] \n',
      },
    ],
  },
  ui: {
    showTagCloud: true,
    showHealthScore: true,
    showEmbedRef: true,
    maxRecentItems: 20,
    compactMode: false,
    searchHistory: [],
    debug: false,
    modules: {
      stats: true,
      tasks: true,
      recent: true,
      weekly: true,
      health: true,
      suggestions: true,
      embed: true,
      otherVaults: true,
      orphans: true,
    },
  },
  version: 1,
};

export const SCAN_FREQUENCIES = [
  { value: 'realtime' as const, label: '实时' },
  { value: '30s' as const, label: '30 秒' },
  { value: '60s' as const, label: '1 分钟' },
  { value: '5min' as const, label: '5 分钟' },
  { value: 'manual' as const, label: '手动' },
];

export const EMBED_EXTENSION_CATEGORIES = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'],
} as const;
