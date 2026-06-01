import { vi } from 'vitest';

export const mockApp = {
  vault: {
    adapter: {
      basePath: '/mock/base',
      read: vi.fn(),
      write: vi.fn(),
      exists: vi.fn(),
    },
    getMarkdownFiles: vi.fn().mockReturnValue([]),
    getAbstractFileByPath: vi.fn(),
  },
  metadataCache: {
    getFileCache: vi.fn().mockReturnValue(null),
    on: vi.fn(),
    off: vi.fn(),
  },
  workspace: {
    getLeavesOfType: vi.fn().mockReturnValue([]),
    createLink: vi.fn(),
    openLinkText: vi.fn(),
    getRightLeaf: vi.fn().mockReturnValue(null),
    revealLeaf: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    onLayoutReady: vi.fn((cb: () => void) => cb()),
    detachLeavesOfType: vi.fn(),
  },
};

export function createMockPlugin(overrides: Record<string, unknown> = {}) {
  return {
    app: mockApp,
    settings: {
      vaults: [],
      scan: {
        frequency: '60s' as const,
        incrementalOnly: true,
        maxFileSize: 10485760,
        fileTypes: { enabled: ['.md'] },
        autoScanOnFocus: false,
      },
      ignore: {
        patterns: ['.git', 'node_modules', '.obsidian', '_attachments', '*.exe'],
        ignoreDotFiles: true,
      },
      templates: { defaultTemplates: {}, defaultFolders: {} },
      ui: {
        showTagCloud: true,
        showHealthScore: true,
        showEmbedRef: true,
        maxRecentItems: 20,
        compactMode: false,
        searchHistory: [],
      },
      version: 1,
    },
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
    loadData: vi.fn().mockResolvedValue({}),
    saveData: vi.fn().mockResolvedValue(undefined),
    eventBus: {
      on: vi.fn().mockReturnValue(() => {}),
      off: vi.fn(),
      emit: vi.fn(),
      once: vi.fn(),
      clear: vi.fn(),
    },
    addCommand: vi.fn(),
    addSettingTab: vi.fn(),
    registerView: vi.fn(),
    registerDomEvent: vi.fn(),
    ...overrides,
  };
}
