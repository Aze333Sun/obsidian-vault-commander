import type { SearchParams, SearchResult, SearchNoteEntry } from '../types/search';
import type { VaultSnapshot } from '../types/snapshot';

export class SearchEngine {
  private indexes: Map<string, any> = new Map();
  private indexReady = false;
  private buildPromise: Promise<void> | null = null;
  private allEntries: SearchNoteEntry[] = [];

  private createMiniSearch(): any {
    const MiniSearch = require('minisearch');
    return new MiniSearch({
      fields: ['title', 'content', 'tags'],
      storeFields: ['title', 'fileName', 'vaultId', 'fullPath'],
      searchOptions: {
        boost: { title: 3, tags: 2, content: 1 },
        prefix: true,
        fuzzy: 0.2,
      },
    });
  }

  async buildVaultIndex(vaultId: string, entries: SearchNoteEntry[]): Promise<void> {
    const miniSearch = this.createMiniSearch();
    for (const entry of entries) {
      miniSearch.add(entry);
    }
    this.indexes.set(vaultId, miniSearch);
  }

  async buildFullIndex(snapshots: Map<string, VaultSnapshot>): Promise<void> {
    this.buildPromise = this.buildAllIndexes(snapshots);
    await this.buildPromise;
  }

  private async buildAllIndexes(snapshots: Map<string, VaultSnapshot>): Promise<void> {
    this.allEntries = [];
    const combined = this.createMiniSearch();

    for (const [vaultId] of snapshots) {
      const entries = this.allEntries.filter(e => e.vaultId === vaultId);
      for (const entry of entries) {
        combined.add(entry);
      }
      this.indexes.set(vaultId, combined);
    }

    this.indexReady = true;
  }

  async search(params: SearchParams): Promise<SearchResult[]> {
    if (!this.indexReady) {
      if (this.buildPromise) {
        await this.buildPromise;
      }
    }

    const targetIndexes = params.vaultIds
      ? params.vaultIds.map(id => this.indexes.get(id)).filter(Boolean)
      : [...this.indexes.values()];

    let results: any[] = [];
    for (const miniSearch of targetIndexes) {
      if (!miniSearch) continue;
      const raw = miniSearch.search(params.query, {
        fuzzy: params.mode === 'content' ? 0.2 : 0,
        prefix: true,
      });
      results.push(...raw);
    }

    results.sort((a, b) => b.score - a.score);
    const maxResults = params.maxResults ?? 50;
    results = results.slice(0, maxResults);

    return results.map((r: any) => ({
      vaultId: r.vaultId ?? '',
      vaultName: '',
      fileName: r.fileName ?? '',
      fullPath: r.fullPath ?? '',
      title: r.title ?? '',
      matches: [],
      score: r.score ?? 0,
    }));
  }

  destroy(): void {
    this.indexes.clear();
    this.indexReady = false;
    this.buildPromise = null;
  }
}
