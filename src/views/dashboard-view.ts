import { ItemView, WorkspaceLeaf } from 'obsidian';
import Dashboard from '../ui/Dashboard.svelte';
import type VaultCommanderPlugin from '../main';

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
        scanning: false,
        error: null,
        onRefresh: () => this.plugin.scanner.refresh(),
        onOpenNote: (vaultId: string, filePath: string) =>
          this.plugin.dispatcher.jumpToNote(
            this.plugin.settings.vaults.find(v => v.id === vaultId)!,
            filePath,
          ),
        onOpenVault: (vaultId: string) =>
          this.plugin.dispatcher.openVault(vaultId),
        onSearch: (_query: string) => {
          // Phase 2: Open search modal
        },
        onTagClick: (_tag: string) => {
          // Phase 2: Search by tag
        },
      },
    });
  }

  private unmountSvelteComponent(): void {
    this.component?.$destroy();
    this.component = null;
  }

  private registerEventListeners(): void {
    this.eventCleanups = [
      this.plugin.eventBus.on('scan:start', () => {
        this.component?.$set({ scanning: true, error: null });
      }),

      this.plugin.eventBus.on('scan:complete', ({ snapshots }) => {
        const vaults: any[] = [];
        const allStats: any[] = [];
        const allRecent: any[] = [];
        const allTags: Array<{ tag: string; count: number }> = [];

        for (const [, snapshot] of snapshots as Map<string, any>) {
          const vaultConfig = this.plugin.settings.vaults.find((v: { id: string }) => v.id === snapshot.vaultId);
          vaults.push({
            id: snapshot.vaultId,
            name: vaultConfig?.name ?? snapshot.vaultId,
            path: vaultConfig?.path ?? '',
            totalNotes: snapshot.totalNotes,
          });

          allStats.push({
            vaultId: snapshot.vaultId,
            vaultName: vaultConfig?.name ?? snapshot.vaultId,
            totalNotes: snapshot.totalNotes,
            totalFolders: snapshot.totalFolders,
            tagCount: Object.keys(snapshot.tags).length,
            added24h: snapshot.stats.added24h,
            added7d: snapshot.stats.added7d,
          });

          allRecent.push(...snapshot.recentChanges);

          for (const [tag, count] of Object.entries(snapshot.tags as Record<string, number>)) {
            allTags.push({ tag: String(tag), count: Number(count) });
          }
        }

        allTags.sort((a, b) => b.count - a.count);
        const uniqueTags = allTags.filter((t: { tag: string }, i: number, arr: Array<{ tag: string }>) =>
          arr.findIndex(x => x.tag === t.tag) === i
        );

        this.component?.$set({
          scanning: false,
          vaults,
          stats: allStats,
          recentChanges: allRecent.slice(0, 20),
          tagCloud: uniqueTags.slice(0, 50),
        });
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
