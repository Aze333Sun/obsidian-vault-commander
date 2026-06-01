import MiniSearch, { type SearchResult as MiniSearchResult } from 'minisearch';
import type { SearchParams, SearchResult, SearchMatch } from '../types/search';
import type { VaultSnapshot } from '../types/snapshot';
import type { VaultConfig } from '../types/settings';

interface IndexedEntry {
  docId: string;
  vaultId: string;
  vaultName: string;
  fileName: string;
  fullPath: string;
  title: string;
  content: string;
  tags: string;
  size: number;
}

export class SearchEngine {
  private miniSearch: MiniSearch<IndexedEntry> | null = null;
  private indexReady = false;
  private buildPromise: Promise<void> | null = null;
  private searchAbortController: AbortController | null = null;

  private createMiniSearch(): MiniSearch<IndexedEntry> {
    return new MiniSearch<IndexedEntry>({
      idField: 'docId',
      fields: ['title', 'content', 'tags', 'fileName'],
      storeFields: ['title', 'fileName', 'vaultId', 'vaultName', 'fullPath'],
      searchOptions: {
        boost: { title: 3, tags: 2, content: 1, fileName: 1.5 },
        prefix: true,
        fuzzy: 0.2,
      },
      extractField: (document, fieldName) => {
        // Handle all fields explicitly
        if (fieldName === 'docId') return document.docId;
        if (fieldName === 'tags') return document.tags.split(' ').join(' ');
        if (fieldName === 'title') return document.title;
        if (fieldName === 'content') return document.content;
        if (fieldName === 'fileName') return document.fileName;
        if (fieldName === 'vaultId') return document.vaultId;
        if (fieldName === 'vaultName') return document.vaultName;
        if (fieldName === 'fullPath') return document.fullPath;
        if (fieldName === 'size') return String(document.size);
        return '';
      },
    });
  }

  async buildIndex(snapshots: Map<string, VaultSnapshot>, vaults: VaultConfig[]): Promise<void> {
    this.buildPromise = this.buildAllIndexes(snapshots, vaults);
    await this.buildPromise;
  }

  private async buildAllIndexes(
    snapshots: Map<string, VaultSnapshot>,
    vaults: VaultConfig[],
  ): Promise<void> {
    this.miniSearch = this.createMiniSearch();
    const vaultMap = new Map(vaults.map((v) => [v.id, v]));

    const entries: IndexedEntry[] = [];

    for (const [vaultId, snapshot] of snapshots) {
      const vaultConfig = vaultMap.get(vaultId);
      const vaultName = vaultConfig?.name ?? vaultId;

      for (const change of snapshot.recentChanges) {
        if (change.size > 10 * 1024 * 1024) continue; // Skip files > 10MB

        entries.push({
          docId: `${vaultId}::${change.fileName}`,
          vaultId,
          vaultName,
          fileName: change.fileName,
          fullPath: change.fileName,
          title: change.title,
          content: '', // Content will be populated by scanner
          tags: change.tags.join(' '),
          size: change.size,
        });
      }
    }

    await this.addEntriesInChunks(entries);
    this.indexReady = true;
  }

  private async addEntriesInChunks(entries: IndexedEntry[]): Promise<void> {
    const chunkSize = 100;
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      for (const entry of chunk) {
        this.miniSearch!.add(entry);
      }
      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  async search(
    params: SearchParams,
    _snapshots?: Map<string, VaultSnapshot>,
  ): Promise<SearchResult[]> {
    // Cancel previous search
    this.searchAbortController?.abort();
    this.searchAbortController = new AbortController();
    const signal = this.searchAbortController.signal;

    if (!this.indexReady) {
      if (this.buildPromise) {
        await this.buildPromise;
      } else {
        return [];
      }
    }

    if (!this.miniSearch) return [];
    if (signal.aborted) return [];

    const maxResults = params.maxResults ?? 50;
    let rawResults: MiniSearchResult[] = [];

    switch (params.mode) {
      case 'filename':
        rawResults = this.miniSearch.search(params.query, {
          fields: ['fileName', 'title'],
          prefix: true,
          fuzzy: 0,
          boost: { fileName: 2, title: 3 },
        });
        break;

      case 'tag':
        rawResults = this.miniSearch.search(params.query, {
          fields: ['tags'],
          prefix: true,
          fuzzy: 0,
          combineWith: 'AND',
        });
        break;

      case 'content':
      default:
        rawResults = this.miniSearch.search(params.query, {
          prefix: true,
          fuzzy: 0.2,
        });
        break;
    }

    if (signal.aborted) return [];

    // Sort by score
    rawResults.sort((a, b) => b.score - a.score);

    // Filter by vault if specified
    if (params.vaultIds && params.vaultIds.length > 0) {
      const vaultSet = new Set(params.vaultIds);
      rawResults = rawResults.filter((r) => vaultSet.has(r.vaultId as string));
    }

    // Trim to max results
    rawResults = rawResults.slice(0, maxResults);

    // Extract matching context lines
    return rawResults.map((r) => {
      const vaultName = ((r as Record<string, unknown>).vaultName as string) ?? '';
      return {
        vaultId: r.vaultId as string,
        vaultName,
        fileName: r.fileName as string,
        fullPath: r.fullPath as string,
        title: r.title as string,
        matches: this.extractMatches(r, params.query),
        score: r.score,
      };
    });
  }

  private extractMatches(result: MiniSearchResult, query: string): SearchMatch[] {
    const matches: SearchMatch[] = [];
    const matchData = result.match ?? {};

    for (const [field, fieldMatches] of Object.entries(matchData)) {
      if (field === 'tags' || field === 'id') continue;

      for (const matchStr of fieldMatches as string[]) {
        const lower = matchStr.toLowerCase();
        const queryLower = query.toLowerCase();
        const idx = lower.indexOf(queryLower);
        if (idx >= 0) {
          matches.push({
            line: 0,
            content: matchStr.slice(Math.max(0, idx - 30), idx + query.length + 30),
            highlights: [[Math.min(idx, 30), Math.min(idx, 30) + query.length]],
          });
        }
      }
    }

    // Ensure at least one match entry
    if (matches.length === 0) {
      matches.push({
        line: 0,
        content: (result.title as string) || (result.fileName as string) || '',
        highlights: [[0, 0]],
      });
    }

    return matches.slice(0, 3);
  }

  isIndexReady(): boolean {
    return this.indexReady;
  }

  getDocumentCount(): number {
    return this.miniSearch?.documentCount ?? 0;
  }

  destroy(): void {
    this.searchAbortController?.abort();
    this.miniSearch?.removeAll();
    this.miniSearch = null;
    this.indexReady = false;
    this.buildPromise = null;
  }
}
