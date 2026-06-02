import { ItemView, WorkspaceLeaf } from 'obsidian';
import Dashboard from '../ui/Dashboard.svelte';
import { HOST_VAULT_ID } from '../core/scanner';
import { NotePreviewModal } from '../modals/preview-modal';
import type VaultCommanderPlugin from '../main';
import type { HealthScore, Suggestion } from '../types/analyzer';
import type { TaskItem } from '../types/snapshot';

export class DashboardView extends ItemView {
  static VIEW_TYPE = 'vault-commander-dashboard';
  static DISPLAY_TEXT = 'Vault Commander 控制台';
  static ICON = 'gauge';

  private component: Dashboard | null = null;
  private eventCleanups: Array<() => void> = [];
  private plugin: VaultCommanderPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: VaultCommanderPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return DashboardView.VIEW_TYPE;
  }

  getDisplayText(): string {
    return DashboardView.DISPLAY_TEXT;
  }

  getIcon(): string {
    return DashboardView.ICON;
  }

  async onOpen(): Promise<void> {
    this.mountSvelteComponent();
    this.registerEventListeners();
    this.pushDebugReport();
  }

  async onClose(): Promise<void> {
    for (const cleanup of this.eventCleanups) {
      cleanup();
    }
    this.eventCleanups = [];
    this.unmountSvelteComponent();
  }

  private mountSvelteComponent(): void {
    this.component = new Dashboard({
      target: this.contentEl,
      props: {
        vaults: [],
        stats: [],
        recentChanges: [],
        tagCloud: [],
        healthData: [],
        suggestions: [],
        embedData: [],
        scanning: false,
        error: null,
        debugReport: null,
        onToggleDebug: () => this.toggleDebug(),
        tasks: [],
        onClearDebugLogs: () => this.clearDebugLogs(),
        onOpenTask: (vaultId: string, fileName: string, line: number) =>
          this.openTask(vaultId, fileName, line),
        onToggleTask: (task: TaskItem) => this.toggleTask(task),
        onRefresh: () => this.plugin.scanner.refresh(),
        onOpenNote: (vaultId: string, filePath: string) => {
          const modal = new NotePreviewModal(this.plugin);
          modal.open(vaultId, filePath);
        },
        onNewNote: () => {
          if (!this.plugin.newNoteModal) {
            const { NewNoteModal } = require('../modals/new-note-modal');
            (this.plugin as any).newNoteModal = new NewNoteModal(this.plugin);
          }
          this.plugin.newNoteModal?.open();
        },
        onImport: () => {
          const { ImportModal } = require('../modals/import-modal');
          const modal = new ImportModal(this.plugin);
          modal.open();
        },
        onSearch: () => {
          if (!this.plugin.searchModal) {
            const { SearchModal } = require('../modals/search-modal');
            (this.plugin as any).searchModal = new SearchModal(this.plugin);
          }
          this.plugin.searchModal?.open();
        },
        onTagClick: (_tag: string) => {
          if (!this.plugin.searchModal) {
            const { SearchModal } = require('../modals/search-modal');
            (this.plugin as any).searchModal = new SearchModal(this.plugin);
          }
          this.plugin.searchModal?.open();
        },
      },
    });
  }

  private unmountSvelteComponent(): void {
    this.component?.$destroy();
    this.component = null;
  }

  private pushDebugReport(): void {
    try {
      this.component?.$set({ debugReport: this.plugin.debugLogger.getReport() });
    } catch {
      // Debug report push failure is non-critical
    }
  }

  private async updateDashboard(snapshots: Map<string, any>): Promise<void> {
    // 更新调试快照信息
    this.plugin.debugLogger.updateSnapshotInfo(
      new Map(
        Array.from(snapshots.entries()).map(([id, s]) => [
          id,
          { totalNotes: s.totalNotes, scannedAt: s.scannedAt },
        ]),
      ),
    );

    this.plugin.debugLogger.addLog(
      'debug',
      'dashboard',
      `更新仪表盘: ${snapshots.size} 个快照`,
    );

    const vaults: Array<{
      id: string;
      name: string;
      path: string;
      totalNotes: number;
      isHost: boolean;
    }> = [];
    const allStats: Array<{
      vaultId: string;
      vaultName: string;
      totalNotes: number;
      totalFolders: number;
      tagCount: number;
      added24h: number;
      added7d: number;
    }> = [];
    const allRecent: any[] = [];
    const tagMap = new Map<string, { tag: string; count: number; vaultId: string }>();
    const allHealthData: HealthScore[] = [];
    const allSuggestions: Suggestion[] = [];
    const allTasks: TaskItem[] = [];
    const embedData: Array<{
      vaultId: string; vaultName: string;
      images: number; audio: number; video: number; other: number; broken: number;
    }> = [];

    // Single pass: vaults, stats, recent, tasks, tags, health, embeds
    for (const [, snapshot] of snapshots) {
      const vaultConfig =
        snapshot.vaultId === HOST_VAULT_ID
          ? this.plugin.scanner.getHostVaultConfig()
          : this.plugin.settings.vaults.find((v: { id: string }) => v.id === snapshot.vaultId);
      const vaultName = vaultConfig?.name ?? snapshot.vaultId;
      const isHost = snapshot.vaultId === HOST_VAULT_ID || !!snapshot.isHost;

      vaults.push({
        id: snapshot.vaultId,
        name: isHost ? `${vaultName} (当前库)` : vaultName,
        path: vaultConfig?.path ?? '',
        totalNotes: snapshot.totalNotes,
        isHost,
      });

      allStats.push({
        vaultId: snapshot.vaultId, vaultName,
        totalNotes: snapshot.totalNotes, totalFolders: snapshot.totalFolders,
        tagCount: Object.keys(snapshot.tags).length,
        added24h: snapshot.stats.added24h, added7d: snapshot.stats.added7d,
      });

      allRecent.push(...snapshot.recentChanges);

      if (snapshot.tasks) {
        for (const t of snapshot.tasks) allTasks.push({ ...t, vaultName });
      }

      // Tags with Map dedup
      for (const [tag, count] of Object.entries(snapshot.tags as Record<string, number>)) {
        const key = String(tag);
        const existing = tagMap.get(key);
        if (existing) existing.count += Number(count);
        else tagMap.set(key, { tag: key, count: Number(count), vaultId: snapshot.vaultId });
      }

      // Embeds inline
      let emb = { images: 0, audio: 0, video: 0, other: 0, broken: 0 };
      for (const c of snapshot.recentChanges) {
        emb.images += c.embeds?.images ?? 0;
        emb.audio += c.embeds?.audio ?? 0;
        emb.video += c.embeds?.video ?? 0;
        emb.other += c.embeds?.other ?? 0;
        emb.broken += c.embeds?.broken ?? 0;
      }
      embedData.push({ vaultId: snapshot.vaultId, vaultName, ...emb });

      // Health score
      try {
        const healthScore = await this.plugin.analyzer.getHealthScore(snapshot);
        healthScore.vaultName = vaultName;
        allHealthData.push(healthScore);
        allSuggestions.push(...(await this.plugin.analyzer.getSuggestions(snapshot)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.plugin.debugLogger.addLog('error', 'dashboard', `健康度计算失败 (${vaultName}): ${msg}`, err);
      }
    }

    // Sorted unique tags
    const uniqueTags = [...tagMap.values()].sort((a, b) => b.count - a.count);

    // Suggest plugin install for large external vaults
    for (const [, snapshot] of snapshots) {
      if (!snapshot.isHost && snapshot.totalNotes > 20) {
        const vc = vaults.find((v: { id: string }) => v.id === snapshot.vaultId);
        allSuggestions.push({
          type: 'tip' as const,
          message: `「${vc?.name ?? snapshot.vaultId}」有 ${snapshot.totalNotes} 篇笔记，建议在该库安装 Vault Commander 实现多级管理`,
        });
      }
    }

    // Tag analysis for cross-vault overlap
    const typedSnapshots = new Map<string, any>(snapshots);
    try {
      const tagAnalysis = await this.plugin.analyzer.getTagAnalysis(typedSnapshots);
      if (tagAnalysis.overlap.length > 0) {
        allSuggestions.push({
          type: 'info' as const,
          message: `${tagAnalysis.overlap.length} 个标签跨库共用`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.plugin.debugLogger.addLog('error', 'dashboard', `标签分析失败: ${msg}`, err);
    }

    try {
      this.component?.$set({
        scanning: false,
        vaults,
        stats: allStats,
        recentChanges: allRecent.slice(0, this.plugin.settings.ui.maxRecentItems),
        tagCloud: uniqueTags.slice(0, 50),
        healthData: allHealthData,
        suggestions: allSuggestions,
        tasks: allTasks,
        embedData,
      });
      this.plugin.debugLogger.addLog('debug', 'dashboard', '$set 完成');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.plugin.debugLogger.addLog('error', 'dashboard', `$set 失败: ${msg}`, err);
    }

    // 推送最新调试报告
    this.pushDebugReport();
  }

  private registerEventListeners(): void {
    this.eventCleanups = [
      this.plugin.eventBus.on('scan:start', () => {
        try {
          this.component?.$set({ scanning: true, error: null });
        } catch (err) {
          this.plugin.debugLogger.addLog('error', 'dashboard', `$set(scanning) 失败: ${String(err)}`);
        }
      }),

      this.plugin.eventBus.on('scan:complete', ({ snapshots }) => {
        this.updateDashboard(snapshots);
      }),

      this.plugin.eventBus.on('scan:error', ({ vaultId, error }) => {
        try {
          this.component?.$set({
            scanning: false,
            error: `扫描库 ${vaultId} 失败: ${error.message}`,
          });
        } catch (err) {
          this.plugin.debugLogger.addLog('error', 'dashboard', `$set(error) 失败: ${String(err)}`);
        }
        this.pushDebugReport();
      }),
    ];
  }

  async refresh(): Promise<void> {
    await this.plugin.scanner.refresh();
  }

  private openTask(vaultId: string, fileName: string, _line: number): void {
    const modal = new NotePreviewModal(this.plugin);
    modal.open(vaultId, fileName);
  }

  private async toggleTask(task: TaskItem): Promise<void> {
    const vault = this.plugin.settings.vaults.find((v: { id: string }) => v.id === task.vaultId)
      || (task.vaultId === HOST_VAULT_ID ? this.plugin.scanner.getHostVaultConfig() : null);
    if (!vault) return;

    try {
      const fs = require('fs');
      const nodePath = require('path');
      const fullPath = nodePath.join(vault.path, task.fileName);
      let content = await fs.promises.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');
      const lineIdx = task.line - 1;

      if (lineIdx >= 0 && lineIdx < lines.length) {
        const line = lines[lineIdx];
        if (task.done) {
          lines[lineIdx] = line.replace(/\[[xX]\]/, '[ ]');
        } else {
          lines[lineIdx] = line.replace(/\[ \]/, '[x]');
        }
        await fs.promises.writeFile(fullPath, lines.join('\n'), 'utf-8');
        // Trigger re-scan
        this.plugin.scanner.scanIncremental();
      }
    } catch (err) {
      this.plugin.debugLogger.addLog('error', 'task', `切换任务状态失败: ${String(err)}`);
    }
  }

  private clearDebugLogs(): void {
    this.plugin.debugLogger.clear();
    this.pushDebugReport();
  }

  private toggleDebug(): void {
    const dl = this.plugin.debugLogger;
    dl.enabled = !dl.enabled;
    if (dl.enabled) {
      dl.captureConsole();
    } else {
      dl.releaseConsole();
    }
    this.plugin.settings.ui.debug = dl.enabled;
    this.plugin.saveSettings();
    this.pushDebugReport();
  }
}
