import { ItemView, WorkspaceLeaf } from 'obsidian';
import Dashboard from '../ui/Dashboard.svelte';
import type VaultCommanderPlugin from '../main';
import type { HealthScore, Suggestion } from '../types/analyzer';

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
        onRefresh: () => this.plugin.scanner.refresh(),
        onOpenNote: (vaultId: string, filePath: string) => {
          const vault = this.plugin.settings.vaults.find(
            (v: { id: string }) => v.id === vaultId,
          );
          if (vault) {
            this.plugin.dispatcher.jumpToNote(vault, filePath);
          }
        },
        onOpenVault: (vaultId: string) =>
          this.plugin.dispatcher.openVault(vaultId),
        onSearch: (_query: string) => {
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

  private async updateDashboard(snapshots: Map<string, any>): Promise<void> {
    const vaults: Array<{
      id: string;
      name: string;
      path: string;
      totalNotes: number;
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
    const allTags: Array<{ tag: string; count: number }> = [];
    const allHealthData: HealthScore[] = [];
    const allSuggestions: Suggestion[] = [];

    const typedSnapshots = new Map<string, any>(snapshots);

    for (const [, snapshot] of snapshots) {
      const vaultConfig = this.plugin.settings.vaults.find(
        (v: { id: string }) => v.id === snapshot.vaultId,
      );
      const vaultName = vaultConfig?.name ?? snapshot.vaultId;

      vaults.push({
        id: snapshot.vaultId,
        name: vaultName,
        path: vaultConfig?.path ?? '',
        totalNotes: snapshot.totalNotes,
      });

      allStats.push({
        vaultId: snapshot.vaultId,
        vaultName,
        totalNotes: snapshot.totalNotes,
        totalFolders: snapshot.totalFolders,
        tagCount: Object.keys(snapshot.tags).length,
        added24h: snapshot.stats.added24h,
        added7d: snapshot.stats.added7d,
      });

      allRecent.push(...snapshot.recentChanges);

      for (const [tag, count] of Object.entries(
        snapshot.tags as Record<string, number>,
      )) {
        allTags.push({ tag: String(tag), count: Number(count) });
      }

      // Health score
      try {
        const healthScore = await this.plugin.analyzer.getHealthScore(snapshot);
        healthScore.vaultName = vaultName;
        allHealthData.push(healthScore);

        // Suggestions
        const suggestions = await this.plugin.analyzer.getSuggestions(snapshot);
        allSuggestions.push(...suggestions);
      } catch {
        // Skip health computation for this vault
      }
    }

    // Tag analysis for cross-vault overlap
    try {
      const tagAnalysis = await this.plugin.analyzer.getTagAnalysis(typedSnapshots);
      // Add cross-vault tag info to suggestions
      if (tagAnalysis.overlap.length > 0) {
        allSuggestions.push({
          type: 'info' as const,
          message: `${tagAnalysis.overlap.length} 个标签跨库共用`,
        });
      }
    } catch {
      // Skip tag analysis
    }

    // Sort and deduplicate tags
    allTags.sort((a, b) => b.count - a.count);
    const uniqueTags = allTags.filter(
      (t: { tag: string }, i: number, arr: Array<{ tag: string }>) =>
        arr.findIndex((x) => x.tag === t.tag) === i,
    );

    // Embed reference data
    const embedData: Array<{
      vaultId: string;
      vaultName: string;
      images: number;
      audio: number;
      video: number;
      other: number;
      broken: number;
    }> = [];
    for (const [, snapshot] of snapshots) {
      const vaultConfig = this.plugin.settings.vaults.find(
        (v: { id: string }) => v.id === snapshot.vaultId,
      );
      const vaultName = vaultConfig?.name ?? snapshot.vaultId;
      let embeds = { images: 0, audio: 0, video: 0, other: 0, broken: 0 };
      for (const change of snapshot.recentChanges) {
        embeds.images += change.embeds?.images ?? 0;
        embeds.audio += change.embeds?.audio ?? 0;
        embeds.video += change.embeds?.video ?? 0;
        embeds.other += change.embeds?.other ?? 0;
        embeds.broken += change.embeds?.broken ?? 0;
      }
      embedData.push({ vaultId: snapshot.vaultId, vaultName, ...embeds });
    }

    this.component?.$set({
      scanning: false,
      vaults,
      stats: allStats,
      recentChanges: allRecent.slice(0, this.plugin.settings.ui.maxRecentItems),
      tagCloud: uniqueTags.slice(0, 50),
      healthData: allHealthData,
      suggestions: allSuggestions,
      embedData,
    });
  }

  private registerEventListeners(): void {
    this.eventCleanups = [
      this.plugin.eventBus.on('scan:start', () => {
        this.component?.$set({ scanning: true, error: null });
      }),

      this.plugin.eventBus.on('scan:complete', ({ snapshots }) => {
        this.updateDashboard(snapshots);
      }),

      this.plugin.eventBus.on('scan:error', ({ vaultId, error }) => {
        this.component?.$set({
          scanning: false,
          error: `扫描库 ${vaultId} 失败: ${error.message}`,
        });
      }),
    ];
  }

  async refresh(): Promise<void> {
    await this.plugin.scanner.refresh();
  }
}
