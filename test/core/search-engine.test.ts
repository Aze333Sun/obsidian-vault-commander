import { describe, it, expect } from 'vitest';
import { SearchEngine } from '../../src/core/search-engine';
import type { VaultSnapshot } from '../../src/types/snapshot';
import type { VaultConfig } from '../../src/types/settings';

function createMockSnapshot(
  vaultId: string,
  files: Array<{
    fileName: string;
    title: string;
    tags: string[];
    content: string;
  }>,
): VaultSnapshot {
  return {
    vaultId,
    scannedAt: Date.now(),
    totalNotes: files.length,
    totalFolders: 2,
    notesByFolder: { '/': files.length },
    tags: {},
    recentChanges: files.map((f) => ({
      vaultId,
      fileName: f.fileName,
      title: f.title,
      mtime: Date.now(),
      size: f.content.length,
      tags: f.tags,
      wordCount: f.content.split(/\s+/).length,
      links: { outgoing: 0, incoming: 0 },
      embeds: { images: 0, audio: 0, video: 0, other: 0, total: 0, broken: 0 },
      folder: '/',
      isNew: false,
    })),
    stats: { added24h: 0, added7d: 0, added30d: 0, modified24h: 0, modified7d: 0, modified30d: 0 },
    health: { score: 100, orphanNotes: 0, brokenLinks: 0, brokenEmbeds: 0, lastWeekActiveDays: 7 },
  };
}

const mockVaults: VaultConfig[] = [
  { id: 'v1', name: '个人笔记', path: '/v1', addedAt: 0, isEnabled: true, ignorePatterns: [] },
  { id: 'v2', name: '工作项目', path: '/v2', addedAt: 0, isEnabled: true, ignorePatterns: [] },
];

describe('SearchEngine', () => {
  it('应该成功构建索引', async () => {
    const engine = new SearchEngine();
    const snapshots = new Map<string, VaultSnapshot>();
    snapshots.set(
      'v1',
      createMockSnapshot('v1', [
        { fileName: 'note1.md', title: '测试笔记', tags: ['test'], content: '这是测试内容' },
        { fileName: 'note2.md', title: '学习笔记', tags: ['learn'], content: '学习资料' },
      ]),
    );

    await engine.buildIndex(snapshots, mockVaults);
    expect(engine.isIndexReady()).toBe(true);
    expect(engine.getDocumentCount()).toBe(2);
  });

  it('应该能按内容搜索', async () => {
    const engine = new SearchEngine();
    const snapshots = new Map<string, VaultSnapshot>();
    snapshots.set(
      'v1',
      createMockSnapshot('v1', [
        {
          fileName: 'react.md',
          title: 'React 入门',
          tags: ['react'],
          content: 'React 是一个前端框架',
        },
        { fileName: 'vue.md', title: 'Vue 指南', tags: ['vue'], content: 'Vue 是渐进式框架' },
      ]),
    );
    snapshots.set(
      'v2',
      createMockSnapshot('v2', [
        {
          fileName: 'react-adv.md',
          title: 'React 高级',
          tags: ['react', 'advanced'],
          content: 'React 高级用法',
        },
      ]),
    );

    await engine.buildIndex(snapshots, mockVaults);

    const results = await engine.search({ query: 'React', mode: 'content' });
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.some((r) => r.vaultId === 'v1')).toBe(true);
    expect(results.some((r) => r.vaultId === 'v2')).toBe(true);
  });

  it('应该能按文件名搜索', async () => {
    const engine = new SearchEngine();
    const snapshots = new Map<string, VaultSnapshot>();
    snapshots.set(
      'v1',
      createMockSnapshot('v1', [
        { fileName: 'project-plan.md', title: '项目计划', tags: [], content: '...' },
      ]),
    );

    await engine.buildIndex(snapshots, mockVaults);

    const results = await engine.search({ query: 'project', mode: 'filename' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('应该能按标签搜索', async () => {
    const engine = new SearchEngine();
    const snapshots = new Map<string, VaultSnapshot>();
    snapshots.set(
      'v1',
      createMockSnapshot('v1', [
        { fileName: 'a.md', title: 'A', tags: ['important', 'todo'], content: '...' },
        { fileName: 'b.md', title: 'B', tags: ['draft'], content: '...' },
      ]),
    );

    await engine.buildIndex(snapshots, mockVaults);

    const results = await engine.search({ query: 'important', mode: 'tag' });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe('A');
  });

  it('应该支持 vaultIds 过滤', async () => {
    const engine = new SearchEngine();
    const snapshots = new Map<string, VaultSnapshot>();
    snapshots.set(
      'v1',
      createMockSnapshot('v1', [
        { fileName: 'shared.md', title: '共享笔记', tags: [], content: '跨项目共享内容' },
      ]),
    );
    snapshots.set(
      'v2',
      createMockSnapshot('v2', [
        { fileName: 'shared.md', title: '共享文档', tags: [], content: '另一个共享内容' },
      ]),
    );

    await engine.buildIndex(snapshots, mockVaults);

    const results = await engine.search({ query: '共享', mode: 'content', vaultIds: ['v1'] });
    expect(results.every((r) => r.vaultId === 'v1')).toBe(true);
  });

  it('未构建索引时搜索应返回空', async () => {
    const engine = new SearchEngine();
    const results = await engine.search({ query: 'test', mode: 'content' });
    expect(results).toEqual([]);
  });

  it('应该限制最大结果数', async () => {
    const engine = new SearchEngine();
    const snapshots = new Map<string, VaultSnapshot>();
    snapshots.set(
      'v1',
      createMockSnapshot(
        'v1',
        Array.from({ length: 10 }, (_, i) => ({
          fileName: `note${i}.md`,
          title: `笔记 ${i}`,
          tags: [],
          content: `这是第 ${i} 篇测试内容`,
        })),
      ),
    );

    await engine.buildIndex(snapshots, mockVaults);

    const results = await engine.search({ query: '测试', mode: 'content', maxResults: 3 });
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it('destroy 应该清理状态', async () => {
    const engine = new SearchEngine();
    const snapshots = new Map<string, VaultSnapshot>();
    snapshots.set(
      'v1',
      createMockSnapshot('v1', [{ fileName: 'n.md', title: 'N', tags: [], content: 'c' }]),
    );

    await engine.buildIndex(snapshots, mockVaults);
    expect(engine.isIndexReady()).toBe(true);

    engine.destroy();
    expect(engine.isIndexReady()).toBe(false);
    expect(engine.getDocumentCount()).toBe(0);
  });
});
