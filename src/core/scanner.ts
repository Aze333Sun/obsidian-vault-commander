/**
 * VaultScanner — 知识库扫描器
 *
 * 双模式扫描：
 *   - Host Vault（当前库）：通过 Obsidian MetadataCache API，零 I/O
 *   - External Vault（外库）：通过 fs 遍历文件系统
 *
 * 支持全量扫描、增量扫描（基于 mtime）、自动定时扫描。
 * 扫描期间通过 AbortController 支持中断。
 */
import { VaultCache } from './cache';
import { PerformanceMonitor } from '../utils/performance';
import { LinkParser } from '../utils/link-parser';
import { PathUtils } from '../utils/path';
import type VaultCommanderPlugin from '../main';
import type { VaultConfig } from '../types/settings';
import type { VaultSnapshot, NoteChange, TaskItem } from '../types/snapshot';

// ─── 正则常量 ─────────────────────────────────────
const YAML_FRONT_RE = /^---\n([\s\S]*?)\n---/;
const TAG_LINE_RE = /^tags?\s*:\s*(.+)$/im;
const TAG_LIST_RE = /(?:^|\s)- (.+)/gm;
const TASK_DUE_RE = /📅\s*(\d{4}-\d{2}-\d{2})/u;
export const HOST_VAULT_ID = '__host__';

function parseFrontmatter(raw: string): { title: string; tags: string[] } {
  const match = raw.match(YAML_FRONT_RE);
  if (!match) return { title: '', tags: [] };

  const fm = match[1];
  const tags: string[] = [];

  // Inline: tags: tag1, tag2  or  tags: [tag1, tag2]
  const tagMatch = fm.match(TAG_LINE_RE);
  if (tagMatch) {
    const tagContent = tagMatch[1].trim();
    if (tagContent.startsWith('[')) {
      const inner = tagContent.slice(1, tagContent.lastIndexOf(']'));
      for (const t of inner.split(',')) {
        const cleaned = t.trim().replace(/^['"]|['"]$/g, '');
        if (cleaned) tags.push(cleaned);
      }
    } else {
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

  // Multi-line YAML: tags:\n  - item1\n  - item2
  if (tags.length === 0) {
    const multiTagRe = /^tags?\s*:\s*$/im;
    const multiMatch = fm.match(multiTagRe);
    if (multiMatch) {
      // Find all "- value" lines after the tags: line
      const tagBlock = fm.split(/\n/);
      let inTags = false;
      for (const line of tagBlock) {
        if (/^tags?\s*:\s*$/i.test(line.trim())) {
          inTags = true;
          continue;
        }
        if (inTags) {
          const m2 = line.match(/^\s+-\s+(.+)/);
          if (m2) {
            tags.push(m2[1].trim().replace(/^['"]|['"]$/g, ''));
          } else if (/^\S/.test(line)) {
            // Non-indented line → end of tags section
            break;
          }
        }
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

  // ═══════════════════════════════════════════════════
  // 全量扫描
  // ═══════════════════════════════════════════════════

  /** 扫描所有启用的库（包括当前库），返回 vaultId → VaultSnapshot 映射 */
  async scanAll(): Promise<Map<string, VaultSnapshot>> {
    if (this.isScanning) {
      console.warn('[VC] 扫描正在进行中，跳过');
      return this.cache.getAllSnapshots();
    }

    this.isScanning = true;
    this.abortController = new AbortController();
    this.perf.start('scan:phase1');

    const configs = this.plugin.settings.vaults.filter((v: VaultConfig) => v.isEnabled);
    const hostConfig = this.getHostVaultConfig();
    const hostIsConfigured = configs.some((v) => PathUtils.normalize(v.path) === PathUtils.normalize(hostConfig.path));
    const allVaults = [...configs];
    if (!hostIsConfigured) {
      allVaults.push(hostConfig);
    }

    this.plugin.eventBus.emit('scan:start', {
      vaultIds: allVaults.map((v: VaultConfig) => v.id),
    });

    const results = new Map<string, VaultSnapshot>();

    for (let i = 0; i < allVaults.length; i++) {
      if (this.abortController.signal.aborted) break;

      const config = allVaults[i];
      this.plugin.eventBus.emit('scan:progress', {
        vaultId: config.id,
        progress: Math.round((i / allVaults.length) * 100),
        message: `正在扫描: ${config.name}`,
      });

      try {
        const snapshot = await this.scanVault(config);
        if (snapshot) {
          // 标记宿主库
          if (config.id === HOST_VAULT_ID) {
            snapshot.isHost = true;
          }
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

  // ═══════════════════════════════════════════════════
  // 增量扫描
  // ═══════════════════════════════════════════════════

  /** 基于 mtime 对比的增量扫描，只处理变更文件 */
  async scanIncremental(): Promise<Map<string, VaultSnapshot>> {
    if (this.isScanning) {
      return this.cache.getAllSnapshots();
    }

    this.isScanning = true;
    this.abortController = new AbortController();
    this.perf.start('scan:incremental');

    const results = new Map<string, VaultSnapshot>();
    const configs = this.plugin.settings.vaults.filter((v: VaultConfig) => v.isEnabled);
    const hostConfig = this.getHostVaultConfig();
    const hostIsConfigured = configs.some((v) => PathUtils.normalize(v.path) === PathUtils.normalize(hostConfig.path));
    const allVaults = [...configs];
    if (!hostIsConfigured) {
      allVaults.push(hostConfig);
    }

    for (const config of allVaults) {
      if (this.abortController.signal.aborted) break;

      try {
        const prevSnapshot = this.cache.getSnapshot(config.id);
        const snapshot = await this.scanVaultIncremental(config, prevSnapshot);
        if (snapshot) {
          if (config.id === HOST_VAULT_ID) {
            snapshot.isHost = true;
          }
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

      const fmTags2: string[] = [];
      const rawFmTags2 = (metaCache?.frontmatter as Record<string, unknown> | undefined)?.tags;
      if (Array.isArray(rawFmTags2)) {
        for (const t of rawFmTags2) fmTags2.push(String(t));
      } else if (typeof rawFmTags2 === 'string') {
        fmTags2.push(rawFmTags2);
      }
      for (const t of fmTags2) {
        const tagName = t.replace(/^#/, '');
        snapshot.tags[tagName] = (snapshot.tags[tagName] || 0) + 1;
      }

      // Detect changes vs previous snapshot
      const prevChange = prev.recentChanges.find(
        (c) => c.fileName === file.name && c.folder === dir,
      );

      const isNew = !prevChange || prevChange.mtime !== file.stat.mtime;

      if (isNew) changesDetected = true;

      snapshot.recentChanges.push({
        vaultId: config.id,
        fileName: file.path,
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
    snapshot.tasks = await this.extractHostVaultTasks(config);

    return snapshot;
  }

  private async scanExternalVaultIncremental(
    config: VaultConfig,
    prev: VaultSnapshot,
  ): Promise<VaultSnapshot> {
    const fs = require('fs');
    const nodePath = require('path');
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
            const content = await readFileContent(fullPath, settings.scan.maxFileSize, stat.size);
            const { title, tags: fileTags } = parseFrontmatter(content);
            const links = LinkParser.parse(content);

            for (const t of fileTags) {
              snapshot.tags[t] = (snapshot.tags[t] || 0) + 1;
            }

            const hasTaskTag2 = fileTags.some((t: string) => {
              const lower = t.toLowerCase();
              return lower === 'task' || lower === 'todo';
            });
            if (hasTaskTag2 && /\[[ x]\]/.test(content)) {
              const fileTasks = parseTasks(content, config.id, config.name, relPath, stat.mtimeMs);
              snapshot.tasks.push(...fileTasks);
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

  // ═══════════════════════════════════════════════════
  // 单库扫描（路由：当前库 / 外库）
  // ═══════════════════════════════════════════════════

  /** 根据路径判断使用 MetadataCache API 还是 fs 遍历 */
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

      // Inline #tags
      if (metaCache?.tags) {
        for (const t of metaCache.tags) {
          const tagName = t.tag.replace(/^#/, '');
          snapshot.tags[tagName] = (snapshot.tags[tagName] || 0) + 1;
        }
      }

      // Frontmatter tags: tags: [a, b] or tags:\n  - a\n  - b
      const fmTags: string[] = [];
      const rawFmTags = (metaCache?.frontmatter as Record<string, unknown> | undefined)?.tags;
      if (Array.isArray(rawFmTags)) {
        for (const t of rawFmTags) fmTags.push(String(t));
      } else if (typeof rawFmTags === 'string') {
        fmTags.push(rawFmTags);
      }
      for (const t of fmTags) {
        const tagName = t.replace(/^#/, '');
        snapshot.tags[tagName] = (snapshot.tags[tagName] || 0) + 1;
      }

      snapshot.recentChanges.push({
        vaultId: config.id,
        fileName: file.path,
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
    snapshot.tasks = await this.extractHostVaultTasks(config);

    return snapshot;
  }

  private async scanExternalVault(config: VaultConfig): Promise<VaultSnapshot> {
    const fs = require('fs');
    const nodePath = require('path');
    const settings = this.plugin.settings;

    // Fast path: check if external vault has this plugin installed
    const pluginDataPath = nodePath.join(config.path, '.obsidian', 'plugins', 'vault-commander', 'data.json');
    try {
      await fs.promises.readFile(pluginDataPath, 'utf-8');
      console.log(`[VC] 外库 ${config.name} 已安装控制台，使用快速扫描`);
      // Vault has the plugin — their scan data is in their cache
      // We still do our own scan but note it for efficiency
    } catch {
      // No plugin installed, do full scan
    }

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

          const content = await readFileContent(fullPath, settings.scan.maxFileSize, stat.size);
          const { title, tags: fileTags } = parseFrontmatter(content);
          const links = LinkParser.parse(content);

          for (const t of fileTags) {
            snapshot.tags[t] = (snapshot.tags[t] || 0) + 1;
          }

          const relDir = nodePath.dirname(relPath);
          snapshot.notesByFolder[relDir] = (snapshot.notesByFolder[relDir] || 0) + 1;
          snapshot.totalNotes++;

          // 只解析带 task/todo 标签的文件中的任务
          const hasTaskTag = fileTags.some((t: string) => {
            const lower = t.toLowerCase();
            return lower === 'task' || lower === 'todo';
          });
          if (hasTaskTag && /\[[ x]\]/.test(content)) {
            const fileTasks = parseTasks(content, config.id, config.name, relPath, stat.mtimeMs);
            snapshot.tasks.push(...fileTasks);
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

  // ═══════════════════════════════════════════════════
  // 自动扫描
  // ═══════════════════════════════════════════════════

  /** 根据用户配置的频率启动定时增量扫描 */
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
    this.abortController = null;
    this.isScanning = false;
  }

  // ═══════════════════════════════════════════════════
  // 查询与工具
  // ═══════════════════════════════════════════════════

  /** 获取当前 Obsidian 库的虚拟配置（无需手动添加） */
  getHostVaultConfig(): VaultConfig {
    const adapter = this.plugin.app.vault.adapter as unknown as { basePath: string };
    const basePath = adapter.basePath || '';
    const name = basePath.split(/[/\\]/).filter(Boolean).pop() || '当前库';

    return {
      id: HOST_VAULT_ID,
      name,
      path: basePath,
      addedAt: 0,
      isEnabled: true,
      ignorePatterns: [],
    };
  }

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

  // ═══════════════════════════════════════════════════
  // 任务提取（只处理带 #task/#todo 标签的文件）
  // ═══════════════════════════════════════════════════

  /** 遍历当前库中带 task/todo 标签的 Markdown 文件，解析 - [ ] 列表 */
  private async extractHostVaultTasks(config: VaultConfig): Promise<TaskItem[]> {
    const { app } = this.plugin;
    const markdownFiles = app.vault.getMarkdownFiles();
    const tasks: TaskItem[] = [];
    const vaultName = config.name;

    for (const file of markdownFiles) {
      if (this.abortController?.signal.aborted) break;

      // 只处理带 task/todo 标签的文件
      const meta = app.metadataCache.getFileCache(file);
      if (!meta) continue;

      const tagNames: string[] = [];
      if (meta.tags) {
        for (const t of meta.tags) {
          tagNames.push(t.tag.replace(/^#/, '').toLowerCase());
        }
      }
      if (meta.frontmatter?.tags) {
        const fmTags = Array.isArray(meta.frontmatter.tags) ? meta.frontmatter.tags : [meta.frontmatter.tags];
        for (const t of fmTags) {
          tagNames.push(String(t).toLowerCase());
        }
      }

      if (!tagNames.some((t) => t === 'task' || t === 'todo')) continue;
      if (file.stat.size > this.plugin.settings.scan.maxFileSize) continue;

      try {
        const content = await app.vault.cachedRead(file);
        if (/\[[ x]\]/.test(content)) {
          const fileTasks = parseTasks(content, config.id, vaultName, file.path, file.stat.mtime);
          tasks.push(...fileTasks);
        }
      } catch {
        // Skip files that can't be read
      }
    }

    return tasks;
  }

  // ═══════════════════════════════════════════════════
  // 快照计算与统计
  // ═══════════════════════════════════════════════════

  /** 创建空的快照骨架 */
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
      tasks: [],
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

// ═══════════════════════════════════════════════════
// 模块级辅助函数
// ═══════════════════════════════════════════════════

/** 判断文件/文件夹是否应被忽略 */
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

async function readFileContent(filePath: string, maxSize: number, knownSize?: number): Promise<string> {
  const fs = require('fs');
  try {
    const size = knownSize ?? (await fs.promises.stat(filePath)).size;
    if (size > maxSize) return '';

    const buf = await fs.promises.readFile(filePath);
    return buf.toString('utf-8', 0, Math.min(size, 512 * 1024));
  } catch {
    return '';
  }
}

/** 从 Markdown 文本中解析 - [ ] / - [x] 任务列表，提取优先级和截止日期 */
function parseTasks(
  content: string,
  vaultId: string,
  vaultName: string,
  fileName: string,
  fileMtime: number,
): TaskItem[] {
  const tasks: TaskItem[] = [];
  let lineNum = 0;

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^[\t ]*[-*]\s*\[(.)\]\s*(.+)$/);
    if (!m) {
      if (line.trim() !== '') lineNum++;
      continue;
    }

    lineNum++;
    const done = m[1].toLowerCase() === 'x';
    const body = m[2].trim();

    // Extract due date
    const dueMatch = body.match(TASK_DUE_RE);
    const dueDate = dueMatch ? dueMatch[1] : null;

    // Priority from emoji
    let priority = 0;
    if (/🔺|⏫/u.test(body)) priority = 3;
    else if (/🔼/u.test(body)) priority = 2;
    else if (/🔽/u.test(body)) priority = 1;

    tasks.push({
      id: `${vaultId}::${fileName}::${lineNum}`,
      title: body.replace(/[🔺⏫🔼🔽]\s*/gu, '').replace(/\s*📅\s*\d{4}-\d{2}-\d{2}/u, '').trim(),
      done,
      vaultId,
      vaultName,
      fileName,
      line: lineNum,
      priority,
      dueDate,
      mtime: fileMtime,
    });
  }

  return tasks;
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
