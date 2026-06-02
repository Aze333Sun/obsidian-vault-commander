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
import { DebugLogger } from './utils/debug-logger';
import { SearchModal } from './modals/search-modal';
import { DispatchModal } from './modals/dispatch-modal';
import { ImportModal } from './modals/import-modal';
import { NewNoteModal } from './modals/new-note-modal';
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
  debugLogger!: DebugLogger;

  dashboardView: DashboardView | null = null;
  settingsTab: VaultCommanderSettingTab | null = null;
  searchModal: SearchModal | null = null;
  dispatchModal: DispatchModal | null = null;
  importModal: ImportModal | null = null;
  newNoteModal: NewNoteModal | null = null;

  async onload(): Promise<void> {
    console.log('[Vault Commander] 加载中...');

    await this.loadSettings();

    // 初始化调试日志（必须在其他模块之前）
    this.debugLogger = new DebugLogger();
    this.debugLogger.enabled = this.settings.ui.debug;
    if (this.debugLogger.enabled) {
      this.debugLogger.captureConsole();
    }

    this.eventBus = new EventBus();
    this.perf = new PerformanceMonitor();
    this.fileSystem = new CrossVaultFileSystem();

    this.cache = new VaultCache();
    await this.cache.initialize();

    this.scanner = new VaultScanner(this, this.cache, this.perf);
    this.searchEngine = new SearchEngine();
    this.dispatcher = new NoteDispatcher(this);
    this.analyzer = new InsightsAnalyzer(this.cache);

    this.registerView(DashboardView.VIEW_TYPE, (leaf) => {
      this.dashboardView = new DashboardView(leaf, this);
      return this.dashboardView;
    });

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
      id: 'dispatch-note',
      name: '分发当前笔记到其他库',
      callback: () => this.openDispatchModal(),
    });
    this.addCommand({
      id: 'import-note',
      name: '从外库导入笔记',
      callback: () => this.openImportModal(),
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
    this.debugLogger?.releaseConsole();
    this.app.workspace.detachLeavesOfType(DashboardView.VIEW_TYPE);
    console.log('[Vault Commander] 已卸载');
  }

  async loadSettings(): Promise<void> {
    const data = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.debugLogger.updateVaultConfigs(this.settings.vaults);
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
    if (!this.newNoteModal) {
      this.newNoteModal = new NewNoteModal(this);
    }
    this.newNoteModal.open();
  }

  private openImportModal(): void {
    if (!this.importModal) {
      this.importModal = new ImportModal(this);
    }
    this.importModal.open();
  }

  private openDispatchModal(): void {
    if (!this.dispatchModal) {
      this.dispatchModal = new DispatchModal(this);
    }
    this.dispatchModal.open();
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

    // 分库管理事件 — 自动触发扫描
    this.eventBus.on('vault:added', () => {
      this.debugLogger.addLog('debug', 'main', '分库已添加，开始扫描...');
      this.scanner.scanAll();
    });

    this.eventBus.on('vault:removed', () => {
      this.debugLogger.addLog('debug', 'main', '分库已移除，重新扫描...');
      this.scanner.scanAll();
    });

    this.eventBus.on('vault:updated', () => {
      this.debugLogger.addLog('debug', 'main', '分库配置已更新，重新扫描...');
      this.scanner.scanAll();
    });

    // 追踪所有事件到调试日志
    const trackEvents = [
      'scan:start', 'scan:complete', 'scan:error', 'scan:progress',
      'vault:added', 'vault:removed', 'vault:updated',
      'search:start', 'search:complete',
      'note:created', 'note:dispatched',
      'cache:updated', 'cache:cleared',
    ];
    for (const evt of trackEvents) {
      this.eventBus.on(evt, (payload: unknown) => {
        this.debugLogger.trackEvent(evt, payload);
      });
    }
  }

  async safeExecute<T>(operation: () => Promise<T>, fallback: T, errorMessage: string): Promise<T> {
    try {
      return await operation();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Vault Commander] ${errorMessage}:`, err);
      this.debugLogger.addLog('error', 'safeExecute', `${errorMessage}: ${msg}`, err);
      new Notice(`${errorMessage}。${msg}`);
      return fallback;
    }
  }
}
