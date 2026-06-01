import { VaultCache } from './cache';
import { PerformanceMonitor } from '../utils/performance';
import { LinkParser } from '../utils/link-parser';
import { PathUtils } from '../utils/path';
import type VaultCommanderPlugin from '../main';
import type { VaultConfig } from '../types/settings';
import type { VaultSnapshot, NoteChange } from '../types/snapshot';

const YAML_FRONT_RE = /^---\n([\s\S]*?)\n---/;
const TAG_LINE_RE = /^tags?\s*:\s*(.+)$/im;
const TAG_LIST_RE = /(?:^|\s)- (.+)/gm;

function parseFrontmatter(raw: string): { title: string; tags: string[] } {
  const match = raw.match(YAML_FRONT_RE);
  if (!match) return { title: '', tags: [] };

  const fm = match[1];
  const tags: string[] = [];

  // Extract tags line
  const tagMatch = fm.match(TAG_LINE_RE);
  if (tagMatch) {
    const tagContent = tagMatch[1].trim();
    if (tagContent.startsWith('[')) {
      // Array form: tags: [tag1, tag2]
      const inner = tagContent.slice(1, tagContent.lastIndexOf(']'));
      for (const t of inner.split(',')) {
        const cleaned = t.trim().replace(/^['"]|['"]$/g, '');
        if (cleaned) tags.push(cleaned);
      }
    } else {
      // List form or single tag
      const listMatches = tagContent.matchAll(TAG_LIST_RE);
      for (const m of listMatches) {
        const cleaned = m[1].trim().replace(/^['"]|['"]$/g, '');
        if (cleaned) tags.push(cleaned);
      }
      if (tags.length === 0) {
        tags.push(tagContent.replace(/^['"]|['"]$/g, ''));
      }
    }
  }

  // Extract title from first heading
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : '';

  return { title, tags };
}

export class VaultScanner {
  private isScanning = false;
  private abortController: AbortController | null = null;
  private autoScanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private plugin: VaultCommanderPlugin,
    private cache: VaultCache,
    private perf: PerformanceMonitor,
  ) {}

  async initialize(): Promise<void> {
    await this.cache.initialize();
  }

  // ─── 全量扫描 ─────────────────────────────────────

  async scanAll(): Promise<Map<string, VaultSnapshot>> {
    if (this.isScanning) {
      console.warn('[VC] 扫描正在进行中，跳过');
      return this.cache.getAllSnapshots();
    }

    this.isScanning = true;
    this.abortController = new AbortController();
    this.perf.start('scan:phase1');

    const vaults = this.plugin.settings.vaults.filter((v: VaultConfig) => v.isEnabled);

    this.plugin.eventBus.emit('scan:start', {
      vaultIds: vaults.map((v: VaultConfig) => v.id),
    });

    const results = new Map<string, VaultSnapshot>();

    for (let i = 0; i < vaults.length; i++) {
      if (this.abortController.signal.aborted) break;

      const config = vaults[i];
      this.plugin.eventBus.emit('scan:progress', {
        vaultId: config.id,
        progress: Math.round((i / vaults.length) * 100),
        message: `正在扫描: ${config.name}`,
      });

      try {
        const snapshot = await this.scanVault(config);
        if (snapshot) {
          results.set(config.id, snapshot);
          await this.cache.setSnapshot(config.id, snapshot);
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
    const duration = this.perf.end('scan:phase1');

    this.plugin.eventBus.emit('scan:complete', { snapshots: results });

    console.log(`[VC] 扫描完成: ${results.size} 个库, 耗时 ${duration.toFixed(0)}ms`);

    return results;
  }

  // ─── 增量扫描 ─────────────────────────────────────

  async scanIncremental(): Promise<Map<string, VaultSnapshot>> {
    if (this.isScanning) {
      return this.cache.getAllSnapshots();
    }

    this.isScanning = true;
    this.abortController = new AbortController();
    this.perf.start('scan:incremental');

    const results = new Map<string, VaultSnapshot>();
    const vaults = this.plugin.settings.vaults.filter((v: VaultConfig) => v.isEnabled);

    for (const config of vaults) {
      if (this.abortController.signal.aborted) break;

      try {
        const prevSnapshot = this.cache.getSnapshot(config.id);
        const snapshot = await this.scanVaultIncremental(config, prevSnapshot);
        if (snapshot) {
          results.set(config.id, snapshot);
          await this.cache.setSnapshot(config.id, snapshot);
        }
      } catch (err) {
        console.error(`[VC] 增量扫描 ${config.name} 失败:`, err);
      }
    }

    this.isScanning = false;
    this.perf.end('scan:incremental');

    this.plugin.eventBus.emit('scan:complete', { snapshots: results });
    return results;
  }

  private async scanVaultIncremental(
    config: VaultConfig,
    prevSnapshot: VaultSnapshot | null,
  ): Promise<VaultSnapshot | null> {
    // Fast path: if no previous snapshot, do full scan
    if (!prevSnapshot) {
      return this.scanVault(config);
    }

    const adapterPath = (this.plugin.app.vault.adapter as unknown as Record<string, unknown>)
      .basePath as string | undefined;
    const isCurrentVault = adapterPath
      ? PathUtils.normalize(config.path) === PathUtils.normalize(adapterPath)
      : false;

    if (isCurrentVault) {
      return this.scanHostVaultIncremental(config, prevSnapshot);
    } else {
      return this.scanExternalVaultIncremental(config, prevSnapshot);
    }
  }

  private async scanHostVaultIncremental(
    config: VaultConfig,
    prev: VaultSnapshot,
  ): Promise<VaultSnapshot> {
    const { app } = this.plugin;
    const markdownFiles = app.vault.getMarkdownFiles();

    const snapshot = this.createEmptySnapshot(config.id);
    const folderSet = new Set<string>();
    let changesDetected = false;

    for (const file of markdownFiles) {
      if (this.abortController?.signal.aborted) break;

      const dir = file.parent?.path ?? '/';
      folderSet.add(dir);
      snapshot.notesByFolder[dir] = (snapshot.notesByFolder[dir] || 0) + 1;
      snapshot.totalNotes++;

      const metaCache = app.metadataCache.getFileCache(file);

      if (metaCache?.tags) {
        for (const t of metaCache.tags) {
          const tagName = t.tag.replace(/^#/, '');
          snapshot.tags[tagName] = (snapshot.tags[tagName] || 0) + 1;
        }
      }

      // Detect changes vs previous snapshot
      const prevChange = prev.recentChanges.find(
        (c) => c.fileName === file.name && c.folder === dir,
      );

      const isNew = !prevChange || prevChange.mtime !== file.stat.mtime;

      if (isNew) changesDetected = true;

      snapshot.recentChanges.push({
        vaultId: config.id,
        fileName: file.name,
        title: file.basename,
        mtime: file.stat.mtime,
        size: file.stat.size,
        tags: metaCache?.tags?.map((t: { tag: string }) => t.tag.replace(/^#/, '')) ?? [],
        wordCount: 0,
        links: {
          outgoing: metaCache?.links?.length ?? 0,
          incoming: 0,
        },
        embeds: this.countEmbeds(config, metaCache?.embeds ?? []),
        folder: dir,
        isNew: !prevChange,
      });
    }

    snapshot.totalFolders = folderSet.size;

    // Compute stats
    if (changesDetected) {
      this.computeSnapshotStats(snapshot);
    } else {
      snapshot.stats = prev.stats;
    }

    snapshot.recentChanges.sort((a, b) => b.mtime - a.mtime);

    return snapshot;
  }

  private async scanExternalVaultIncremental(
    config: VaultConfig,
    prev: VaultSnapshot,
  ): Promise<VaultSnapshot> {
    const fs = await import('fs');
    const nodePath = await import('path');
    const settings = this.plugin.settings;

    const snapshot = this.createEmptySnapshot(config.id);
    const folderSet = new Set<string>();

    const prevFileMap = new Map<string, number>();
    for (const c of prev.recentChanges) {
      prevFileMap.set(PathUtils.normalize(c.fileName), c.mtime);
    }

    async function walkDir(dir: string): Promise<void> {
      let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = nodePath.join(dir, entry.name);
        const relPath = PathUtils.normalize(nodePath.relative(config.path, fullPath));

        // Ignore pattern check
        if (shouldIgnore(relPath, entry.name, settings, config)) continue;

        if (entry.isDirectory()) {
          folderSet.add(relPath);
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = nodePath.extname(entry.name).toLowerCase();
          if (!isScanTarget(ext, settings)) continue;

          let stat: { mtimeMs: number; size: number };
          try {
            stat = await fs.promises.stat(fullPath);
          } catch {
            continue;
          }

          // Size limit check
          if (stat.size > settings.scan.maxFileSize) continue;

          const relDir = nodePath.dirname(relPath);
          snapshot.notesByFolder[relDir] = (snapshot.notesByFolder[relDir] || 0) + 1;
          snapshot.totalNotes++;

          const prevMtime = prevFileMap.get(relPath);
          const changed = !prevMtime || stat.mtimeMs !== prevMtime;

          if (changed) {
            const content = await readFileContent(fullPath, settings.scan.maxFileSize);
            const { title, tags: fileTags } = parseFrontmatter(content);
            const links = LinkParser.parse(content);

            for (const t of fileTags) {
              snapshot.tags[t] = (snapshot.tags[t] || 0) + 1;
            }

            snapshot.recentChanges.push({
              vaultId: config.id,
              fileName: relPath,
              title: title || entry.name.replace(ext, ''),
              mtime: stat.mtimeMs,
              size: stat.size,
              tags: fileTags,
              wordCount: countWords(content),
              links: {
                outgoing: links.links.outgoing,
                incoming: 0,
              },
              embeds: links.embeds,
              folder: relDir,
              isNew: !prevMtime,
            });
          } else {
            // Reuse previous change entry
            const prevEntry = prev.recentChanges.find(
              (c) => PathUtils.normalize(c.fileName) === relPath,
            );
            if (prevEntry) {
              snapshot.recentChanges.push({ ...prevEntry, isNew: false });
            }
          }
        }
      }
    }

    await walkDir(config.path);

    snapshot.totalFolders = folderSet.size;
    snapshot.recentChanges.sort((a, b) => b.mtime - a.mtime);
    this.computeSnapshotStats(snapshot);

    return snapshot;
  }

  // ─── 单库扫描 ─────────────────────────────────────

  async scanVault(config: VaultConfig): Promise<VaultSnapshot | null> {
    const adapterPath = (this.plugin.app.vault.adapter as unknown as Record<string, unknown>)
      .basePath as string | undefined;
    const isCurrentVault = adapterPath
      ? PathUtils.normalize(config.path) === PathUtils.normalize(adapterPath)
      : false;

    if (isCurrentVault) {
      return this.scanHostVault(config);
    }
    return this.scanExternalVault(config);
  }

  private async scanHostVault(config: VaultConfig): Promise<VaultSnapshot> {
    const { app } = this.plugin;
    const markdownFiles = app.vault.getMarkdownFiles();
    const snapshot = this.createEmptySnapshot(config.id);
    const folderSet = new Set<string>();

    for (const file of markdownFiles) {
      if (this.abortController?.signal.aborted) break;

      const dir = file.parent?.path ?? '/';
      folderSet.add(dir);
      snapshot.notesByFolder[dir] = (snapshot.notesByFolder[dir] || 0) + 1;
      snapshot.totalNotes++;

      const metaCache = app.metadataCache.getFileCache(file);

      if (metaCache?.tags) {
        for (const t of metaCache.tags) {
          const tagName = t.tag.replace(/^#/, '');
          snapshot.tags[tagName] = (snapshot.tags[tagName] || 0) + 1;
        }
      }

      snapshot.recentChanges.push({
        vaultId: config.id,
        fileName: file.name,
        title: file.basename,
        mtime: file.stat.mtime,
        size: file.stat.size,
        tags: metaCache?.tags?.map((t: { tag: string }) => t.tag.replace(/^#/, '')) ?? [],
        wordCount: 0,
        links: {
          outgoing: metaCache?.links?.length ?? 0,
          incoming: 0,
        },
        embeds: this.countEmbeds(config, metaCache?.embeds ?? []),
        folder: dir,
        isNew: false,
      });
    }

    snapshot.totalFolders = folderSet.size;
    snapshot.recentChanges.sort((a, b) => b.mtime - a.mtime);
    this.computeSnapshotStats(snapshot);

    return snapshot;
  }

  private async scanExternalVault(config: VaultConfig): Promise<VaultSnapshot> {
    const fs = await import('fs');
    const nodePath = await import('path');
    const settings = this.plugin.settings;

    const snapshot = this.createEmptySnapshot(config.id);
    const folderSet = new Set<string>();

    async function walkDir(dir: string): Promise<void> {
      let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = nodePath.join(dir, entry.name);
        const relPath = PathUtils.normalize(nodePath.relative(config.path, fullPath));

        if (shouldIgnore(relPath, entry.name, settings, config)) continue;

        if (entry.isDirectory()) {
          folderSet.add(relPath);
          await walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = nodePath.extname(entry.name).toLowerCase();
          if (!isScanTarget(ext, settings)) continue;

          let stat: { mtimeMs: number; size: number };
          try {
            stat = await fs.promises.stat(fullPath);
          } catch {
            continue;
          }

          if (stat.size > settings.scan.maxFileSize) {
            // Still count the file but skip content reading
            const relDir = nodePath.dirname(relPath);
            snapshot.notesByFolder[relDir] = (snapshot.notesByFolder[relDir] || 0) + 1;
            snapshot.totalNotes++;
            snapshot.recentChanges.push({
              vaultId: config.id,
              fileName: relPath,
              title: entry.name.replace(ext, ''),
              mtime: stat.mtimeMs,
              size: stat.size,
              tags: [],
              wordCount: 0,
              links: { outgoing: 0, incoming: 0 },
              embeds: {
                images: 0,
                audio: 0,
                video: 0,
                other: 0,
                total: 0,
                broken: 0,
              },
              folder: relDir,
              isNew: false,
            });
            continue;
          }

          const content = await readFileContent(fullPath, settings.scan.maxFileSize);
          const { title, tags: fileTags } = parseFrontmatter(content);
          const links = LinkParser.parse(content);

          for (const t of fileTags) {
            snapshot.tags[t] = (snapshot.tags[t] || 0) + 1;
          }

          const relDir = nodePath.dirname(relPath);
          snapshot.notesByFolder[relDir] = (snapshot.notesByFolder[relDir] || 0) + 1;
          snapshot.totalNotes++;

          snapshot.recentChanges.push({
            vaultId: config.id,
            fileName: relPath,
            title: title || entry.name.replace(ext, ''),
            mtime: stat.mtimeMs,
            size: stat.size,
            tags: fileTags,
            wordCount: countWords(content),
            links: {
              outgoing: links.links.outgoing,
              incoming: 0,
            },
            embeds: links.embeds,
            folder: relDir,
            isNew: false,
          });
        }
      }
    }

    await walkDir(config.path);

    snapshot.totalFolders = folderSet.size;
    snapshot.recentChanges.sort((a, b) => b.mtime - a.mtime);
    this.computeSnapshotStats(snapshot);

    return snapshot;
  }

  // ─── 自动扫描 ─────────────────────────────────────

  startAutoScan(): void {
    this.stopAutoScan();

    const freq = this.plugin.settings.scan.frequency;
    if (freq === 'manual' || freq === 'realtime') return;

    const intervalMs: Record<string, number> = {
      '30s': 30_000,
      '60s': 60_000,
      '5min': 300_000,
    };

    const ms = intervalMs[freq] || 60_000;

    this.autoScanTimer = setInterval(() => {
      if (!this.isScanning) {
        this.scanIncremental();
      }
    }, ms);

    console.log(`[VC] 自动扫描已启动: 每 ${freq}`);
  }

  stopAutoScan(): void {
    if (this.autoScanTimer) {
      clearInterval(this.autoScanTimer);
      this.autoScanTimer = null;
    }
    this.abortController?.abort();
  }

  // ─── 查询方法 ─────────────────────────────────────

  getSnapshot(vaultId: string): VaultSnapshot | null {
    return this.cache.getSnapshot(vaultId);
  }

  getAllSnapshots(): Map<string, VaultSnapshot> {
    return this.cache.getAllSnapshots();
  }

  async refresh(): Promise<void> {
    await this.scanAll();
  }

  destroy(): void {
    this.stopAutoScan();
  }

  // ─── 内部工具 ─────────────────────────────────────

  private createEmptySnapshot(vaultId: string): VaultSnapshot {
    return {
      vaultId,
      scannedAt: Date.now(),
      totalNotes: 0,
      totalFolders: 0,
      notesByFolder: {},
      tags: {},
      recentChanges: [],
      stats: {
        added24h: 0,
        added7d: 0,
        added30d: 0,
        modified24h: 0,
        modified7d: 0,
        modified30d: 0,
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

  private computeSnapshotStats(snapshot: VaultSnapshot): void {
    const now = Date.now();
    const day24 = 24 * 60 * 60 * 1000;
    const day7 = 7 * day24;
    const day30 = 30 * day24;

    let modified24 = 0;
    let modified7 = 0;
    let modified30 = 0;
    let added24 = 0;
    let added7 = 0;
    let added30 = 0;

    for (const change of snapshot.recentChanges) {
      const age = now - change.mtime;
      if (change.isNew) {
        if (age <= day24) added24++;
        if (age <= day7) added7++;
        if (age <= day30) added30++;
      } else {
        if (age <= day24) modified24++;
        if (age <= day7) modified7++;
        if (age <= day30) modified30++;
      }
    }

    snapshot.stats.added24h = added24;
    snapshot.stats.added7d = added7;
    snapshot.stats.added30d = added30;
    snapshot.stats.modified24h = modified24;
    snapshot.stats.modified7d = modified7;
    snapshot.stats.modified30d = modified30;

    // Health computation
    const orphanCount = snapshot.recentChanges.filter(
      (c) => c.links.incoming === 0 && c.links.outgoing === 0,
    ).length;

    snapshot.health.orphanNotes = orphanCount;
    snapshot.health.brokenEmbeds = snapshot.recentChanges.reduce(
      (sum, c) => sum + c.embeds.broken,
      0,
    );
    snapshot.health.lastWeekActiveDays = Math.min(
      7,
      new Set(
        snapshot.recentChanges
          .filter((c) => now - c.mtime <= day7)
          .map((c) => new Date(c.mtime).toDateString()),
      ).size,
    );
  }

  private countEmbeds(_config: VaultConfig, embeds: Array<{ link: string }>): NoteChange['embeds'] {
    const IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico']);
    const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);
    const VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv']);

    let images = 0,
      audio = 0,
      video = 0,
      other = 0;

    for (const e of embeds) {
      const ext = PathUtils.extname(e.link);
      if (IMG_EXTS.has(ext)) images++;
      else if (AUDIO_EXTS.has(ext)) audio++;
      else if (VIDEO_EXTS.has(ext)) video++;
      else other++;
    }

    return {
      images,
      audio,
      video,
      other,
      total: embeds.length,
      broken: 0,
    };
  }
}

// ─── 模块级辅助函数 ───────────────────────────────

function shouldIgnore(
  relPath: string,
  entryName: string,
  settings: { ignore: { patterns: string[]; ignoreDotFiles: boolean } },
  vaultConfig: VaultConfig,
): boolean {
  // Dot files
  if (settings.ignore.ignoreDotFiles && entryName.startsWith('.')) {
    return true;
  }

  const allPatterns = [...settings.ignore.patterns, ...vaultConfig.ignorePatterns];

  for (const pattern of allPatterns) {
    if (matchGlob(pattern, relPath, entryName)) return true;
  }

  return false;
}

function matchGlob(pattern: string, _relPath: string, entryName: string): boolean {
  // Exact name match
  if (pattern === entryName) return true;

  // Extension match: *.exe, *.log
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1);
    if (entryName.endsWith(ext)) return true;
  }

  // Path containing match
  const normalized = _relPath.replace(/\\/g, '/');
  if (normalized.includes(pattern)) return true;

  return false;
}

function isScanTarget(
  ext: string,
  settings: { scan: { fileTypes: { enabled: string[] } } },
): boolean {
  const enabled = settings.scan.fileTypes.enabled;
  if (enabled.length > 0) {
    return enabled.includes(ext.toLowerCase());
  }
  return ext === '.md';
}

async function readFileContent(filePath: string, maxSize: number): Promise<string> {
  const fs = await import('fs');
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size > maxSize) return '';

    const fd = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(Math.min(stat.size, 512 * 1024)); // Max 500KB
    await fd.read(buffer, 0, buffer.length, 0);
    await fd.close();
    return buffer.toString('utf-8');
  } catch {
    return '';
  }
}

function countWords(text: string): number {
  // Strip frontmatter
  const bodyMatch = text.match(/^---[\s\S]*?---\n*/);
  const body = bodyMatch ? text.slice(bodyMatch[0].length) : text;

  // Count CJK characters + words
  const cjkCount = (body.match(/[一-鿿぀-ゟ゠-ヿ가-힯]/g) || []).length;
  const wordCount = body
    .replace(/[一-鿿぀-ゟ゠-ヿ가-힯]/g, '')
    .split(/\s+/)
    .filter(Boolean).length;

  return cjkCount + wordCount;
}
