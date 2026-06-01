import SearchModalComponent from './ui/SearchModal.svelte';
import type VaultCommanderPlugin from '../main';
import type { SearchResult } from '../types/search';

export class SearchModal {
  private component: SearchModalComponent | null = null;
  private container: HTMLDivElement | null = null;

  constructor(private plugin: VaultCommanderPlugin) {}

  open(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    this.component = new SearchModalComponent({
      target: this.container,
      props: {
        visible: true,
        onClose: () => this.close(),
        onSearch: async (query: string): Promise<SearchResult[]> => {
          if (!this.plugin.searchEngine.isIndexReady()) {
            const snapshots = this.plugin.scanner.getAllSnapshots();
            await this.plugin.searchEngine.buildIndex(
              snapshots,
              this.plugin.settings.vaults,
            );
          }
          return this.plugin.searchEngine.search(
            { query, mode: 'content', maxResults: 50 },
            this.plugin.scanner.getAllSnapshots(),
          );
        },
        onOpenNote: (vaultId: string, filePath: string) => {
          const vault = this.plugin.settings.vaults.find((v) => v.id === vaultId);
          if (vault) {
            this.plugin.dispatcher.jumpToNote(vault, filePath);
          }
        },
      },
    });
  }

  close(): void {
    this.component?.$destroy();
    this.component = null;
    this.container?.remove();
    this.container = null;
  }
}
