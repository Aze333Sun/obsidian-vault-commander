import { Plugin, Notice } from 'obsidian';
import { VaultCommanderSettingTab } from './settings';
import { DashboardView } from './views/dashboard-view';
import { VaultScanner } from './core/scanner';
import { VaultCache } from './core/cache';
import { SearchEngine } from './core/search-engine';
import { NoteDispatcher } from './core/dispatcher';
import { InsightsAnalyzer } from './core/analyzer';
import { EventBus } from './core/event-bus';
import { CrossVaultFileSystem } from './utils/file';
import { PerformanceMonitor } from './utils/performance';
import { SearchModal } from './modals/search-modal';
import { DEFAULT_SETTINGS } from './constants';
import type { PluginSettings } from './types/settings';

export default class VaultCommanderPlugin extends Plugin {
  settings!: PluginSettings;
  eventBus!: EventBus;
  cache!: VaultCache;
  scanner!: VaultScanner;
  searchEngine!: SearchEngine;
  dispatcher!: NoteDispatcher;
  analyzer!: InsightsAnalyzer;
  perf!: PerformanceMonitor;
  fileSystem!: CrossVaultFileSystem;

  dashboardView: DashboardView | null = null;
  settingsTab: VaultCommanderSettingTab | null = null;
  searchModal: SearchModal | null = null;

  async onload(): Promise<void> {
    console.log('[Vault Commander] 加载中...');

    await this.loadSettings();

    this.eventBus = new EventBus();
    this.perf = new PerformanceMonitor();
    this.fileSystem = new CrossVaultFileSystem();

    this.cache = new VaultCache();
    await this.cache.initialize();

    this.scanner = new VaultScanner(this, this.cache, this.perf);
    this.searchEngine = new SearchEngine();
    this.dispatcher = new NoteDispatcher(this);
    this.analyzer = new InsightsAnalyzer(this.cache);

    this.registerView(
      DashboardView.VIEW_TYPE,
      (leaf) => {
        this.dashboardView = new DashboardView(leaf, this);
        return this.dashboardView;
      }
    );

    this.addCommand({
      id: 'open-dashboard',
      name: '打开控制台',
      callback: () => this.activateView(),
    });
    this.addCommand({
      id: 'new-note-and-dispatch',
      name: '新建笔记并分发',
      callback: () => this.openNewNoteModal(),
    });
    this.addCommand({
      id: 'cross-vault-search',
      name: '跨库搜索',
      hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'f' }],
      callback: () => this.openSearchModal(),
    });
    this.addCommand({
      id: 'refresh-dashboard',
      name: '刷新仪表盘',
      callback: () => this.scanner.refresh(),
    });

    this.settingsTab = new VaultCommanderSettingTab(this);
    this.addSettingTab(this.settingsTab);

    this.registerEventListeners();

    this.app.workspace.onLayoutReady(() => {
      this.activateView();
      if (this.settings.vaults.length > 0) {
        this.scanner.scanAll();
      }
    });

    console.log('[Vault Commander] 加载完成');
  }

  async onunload(): Promise<void> {
    console.log('[Vault Commander] 卸载中...');
    this.scanner?.destroy();
    this.searchEngine?.destroy();
    await this.cache?.flush();
    this.eventBus?.clear();
    this.app.workspace.detachLeavesOfType(DashboardView.VIEW_TYPE);
    console.log('[Vault Commander] 已卸载');
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType(DashboardView.VIEW_TYPE);
    let leaf: ReturnType<typeof workspace.getRightLeaf> = leaves.first() ?? null;

    if (!leaf) {
      leaf = workspace.getRightLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: DashboardView.VIEW_TYPE, active: true });
      }
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  private openNewNoteModal(): void {
    new Notice('新建笔记功能将在 Phase 3 实现');
  }

  private openSearchModal(): void {
    if (!this.searchModal) {
      this.searchModal = new SearchModal(this);
    }
    this.searchModal.open();
  }

  private registerEventListeners(): void {
    this.registerDomEvent(window, 'focus', () => {
      if (this.settings.scan.autoScanOnFocus) {
        this.scanner.scanIncremental();
      }
    });

    this.eventBus.on('scan:complete', ({ snapshots }) => {
      this.searchEngine.buildIndex(snapshots, this.settings.vaults);
    });
  }

  async safeExecute<T>(
    operation: () => Promise<T>,
    fallback: T,
    errorMessage: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      console.error(`[Vault Commander] ${errorMessage}:`, err);
      new Notice(`${errorMessage}。${err instanceof Error ? err.message : ''}`);
      return fallback;
    }
  }
}
