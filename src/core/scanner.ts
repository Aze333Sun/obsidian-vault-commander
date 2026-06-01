import type { VaultConfig } from '../types/settings';
import type { VaultSnapshot, NoteChange } from '../types/snapshot';
import type VaultCommanderPlugin from '../main';

export class VaultScanner {
  private isScanning = false;
  private abortController: AbortController | null = null;

  constructor(
    private plugin: VaultCommanderPlugin,
    private cache: any,
    private perf: any,
  ) {}

  async initialize(): Promise<void> {
    // 从 IndexedDB 恢复缓存
    // 注册事件监听
  }

  async scanAll(): Promise<Map<string, VaultSnapshot>> {
    if (this.isScanning) {
      console.warn('[VC] 扫描正在进行中，跳过');
      return this.cache.getAllSnapshots();
    }

    this.isScanning = true;
    this.perf.start('scan:phase1');

    const results = new Map<string, VaultSnapshot>();
    const vaults = this.plugin.settings.vaults.filter((v: { isEnabled: boolean }) => v.isEnabled);

    for (const config of vaults) {
      try {
        const snapshot = await this.scanVault(config);
        if (snapshot) {
          results.set(config.id, snapshot);
        }
      } catch (err) {
        console.error(`[VC] 扫描库 ${config.name} 失败:`, err);
        this.plugin.eventBus.emit('scan:error', {
          vaultId: config.id,
          error: err instanceof Error ? err : new Error(String(err)),
        });
      }
    }

    this.isScanning = false;
    this.perf.end('scan:phase1');

    await this.cache.persistAll(results);

    this.plugin.eventBus.emit('scan:complete', { snapshots: results });
    return results;
  }

  async scanVault(config: VaultConfig): Promise<VaultSnapshot | null> {
    this.abortController = new AbortController();

    // 区分主库和外库扫描
    const adapterPath = (this.plugin.app.vault.adapter as unknown as Record<string, unknown>).basePath as string | undefined;
    const isCurrentVault = adapterPath
      ? config.path === adapterPath
      : false;

    if (isCurrentVault) {
      return this.scanHostVault(config);
    } else {
      return this.scanExternalVault(config);
    }
  }

  private async scanHostVault(config: VaultConfig): Promise<VaultSnapshot> {
    const { app } = this.plugin;
    const markdownFiles = app.vault.getMarkdownFiles();

    const notesByFolder: Record<string, number> = {};
    const tags: Record<string, number> = {};
    const recentChanges: NoteChange[] = [];
    let totalNotes = 0;
    let totalFolders = 0;

    const folderSet = new Set<string>();

    for (const file of markdownFiles) {
      if (this.abortController?.signal.aborted) break;

      const cache = app.metadataCache.getFileCache(file);
      if (!cache) continue;

      const dir = file.parent?.path ?? '/';
      folderSet.add(dir);
      notesByFolder[dir] = (notesByFolder[dir] || 0) + 1;
      totalNotes++;

      if (cache.tags) {
        for (const t of cache.tags) {
          const tagName = t.tag.replace(/^#/, '');
          tags[tagName] = (tags[tagName] || 0) + 1;
        }
      }

      recentChanges.push({
        vaultId: config.id,
        fileName: file.name,
        title: file.basename,
        mtime: file.stat.mtime,
        size: file.stat.size,
        tags: cache.tags?.map((t: { tag: string }) => t.tag.replace(/^#/, '')) ?? [],
        wordCount: 0,
        links: {
          outgoing: cache.links?.length ?? 0,
          incoming: 0,
        },
        embeds: {
          images: 0, audio: 0, video: 0, other: 0, total: 0, broken: 0,
        },
        folder: dir,
        isNew: false,
      });
    }

    totalFolders = folderSet.size;

    return {
      vaultId: config.id,
      scannedAt: Date.now(),
      totalNotes,
      totalFolders,
      notesByFolder,
      tags,
      recentChanges: recentChanges.slice(0, 20),
      stats: {
        added24h: 0, added7d: 0, added30d: 0,
        modified24h: 0, modified7d: 0, modified30d: 0,
      },
      health: {
        score: 100,
        orphanNotes: 0,
        brokenLinks: 0,
        brokenEmbeds: 0,
        lastWeekActiveDays: 7,
      },
    };
  }

  private async scanExternalVault(config: VaultConfig): Promise<VaultSnapshot> {
    const fs = await import('fs');
    const path = await import('path');

    const notesByFolder: Record<string, number> = {};
    const tags: Record<string, number> = {};
    const recentChanges: NoteChange[] = [];
    let totalNotes = 0;
    const folderSet = new Set<string>();

    async function walkDir(dir: string): Promise<void> {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          folderSet.add(fullPath.replace(config.path, ''));
          await walkDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          totalNotes++;
          const relDir = path.dirname(fullPath).replace(config.path, '');
          notesByFolder[relDir] = (notesByFolder[relDir] || 0) + 1;

          try {
            const stat = await fs.promises.stat(fullPath);
            recentChanges.push({
              vaultId: config.id,
              fileName: entry.name,
              title: entry.name.replace('.md', ''),
              mtime: stat.mtimeMs,
              size: stat.size,
              tags: [],
              wordCount: 0,
              links: { outgoing: 0, incoming: 0 },
              embeds: { images: 0, audio: 0, video: 0, other: 0, total: 0, broken: 0 },
              folder: relDir,
              isNew: false,
            });
          } catch {
            // skip files we can't read
          }
        }
      }
    }

    await walkDir(config.path);

    return {
      vaultId: config.id,
      scannedAt: Date.now(),
      totalNotes,
      totalFolders: folderSet.size,
      notesByFolder,
      tags,
      recentChanges: recentChanges.slice(0, 20),
      stats: {
        added24h: 0, added7d: 0, added30d: 0,
        modified24h: 0, modified7d: 0, modified30d: 0,
      },
      health: {
        score: 100,
        orphanNotes: 0,
        brokenLinks: 0,
        brokenEmbeds: 0,
        lastWeekActiveDays: 7,
      },
    };
  }

  async scanIncremental(): Promise<Map<string, VaultSnapshot>> {
    return this.scanAll();
  }

  getSnapshot(vaultId: string): VaultSnapshot | null {
    return this.cache.getSnapshot(vaultId);
  }

  getAllSnapshots(): Map<string, VaultSnapshot> {
    return this.cache.getAllSnapshots();
  }

  startAutoScan(): void {
    const freq = this.plugin.settings.scan.frequency;
    if (freq === 'manual') return;
    // Auto scan implementation
  }

  stopAutoScan(): void {
    this.abortController?.abort();
  }

  destroy(): void {
    this.stopAutoScan();
  }

  async refresh(): Promise<void> {
    await this.scanAll();
  }
}
