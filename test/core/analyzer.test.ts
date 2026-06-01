import { describe, it, expect } from 'vitest';
import { InsightsAnalyzer } from '../../src/core/analyzer';
import type { VaultSnapshot } from '../../src/types/snapshot';

function createMockSnapshot(overrides: Partial<VaultSnapshot> = {}): VaultSnapshot {
  return {
    vaultId: 'v1',
    scannedAt: Date.now(),
    totalNotes: 100,
    totalFolders: 20,
    notesByFolder: { '/': 50, '/notes': 50 },
    tags: { test: 10, draft: 5, important: 3 },
    recentChanges: [],
    stats: {
      added24h: 3,
      added7d: 15,
      added30d: 40,
      modified24h: 5,
      modified7d: 20,
      modified30d: 60,
    },
    health: {
      score: 85,
      orphanNotes: 5,
      brokenLinks: 2,
      brokenEmbeds: 1,
      lastWeekActiveDays: 5,
    },
    ...overrides,
  };
}

describe('InsightsAnalyzer', () => {
  const analyzer = new InsightsAnalyzer(null);

  describe('getHealthScore', () => {
    it('应该计算健康度评分', async () => {
      const snapshot = createMockSnapshot();
      const result = await analyzer.getHealthScore(snapshot);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
      expect(result.dimensions.activity).toBeGreaterThan(0);
      expect(result.dimensions.linkIntegrity).toBeGreaterThan(0);
    });

    it('空库的活跃度和更新频率为 0', async () => {
      const snapshot = createMockSnapshot({
        totalNotes: 0,
        totalFolders: 0,
        stats: {
          added24h: 0, added7d: 0, added30d: 0,
          modified24h: 0, modified7d: 0, modified30d: 0,
        },
        health: {
          score: 100, orphanNotes: 0, brokenLinks: 0,
          brokenEmbeds: 0, lastWeekActiveDays: 7,
        },
      });
      const result = await analyzer.getHealthScore(snapshot);
      expect(result.dimensions.activity).toBe(100);
      expect(result.dimensions.linkIntegrity).toBe(100);
      expect(result.dimensions.updateFrequency).toBe(0);
    });

    it('孤立笔记会降低链接完整性评分', async () => {
      const good = createMockSnapshot();
      const bad = createMockSnapshot({
        health: { score: 50, orphanNotes: 50, brokenLinks: 10, brokenEmbeds: 5, lastWeekActiveDays: 3 },
      });

      const goodResult = await analyzer.getHealthScore(good);
      const badResult = await analyzer.getHealthScore(bad);

      expect(badResult.dimensions.linkIntegrity).toBeLessThan(
        goodResult.dimensions.linkIntegrity,
      );
    });

    it('低活跃天数会降低活跃度评分', async () => {
      const active = createMockSnapshot({
        health: { score: 90, orphanNotes: 0, brokenLinks: 0, brokenEmbeds: 0, lastWeekActiveDays: 7 },
      });
      const inactive = createMockSnapshot({
        health: { score: 30, orphanNotes: 0, brokenLinks: 0, brokenEmbeds: 0, lastWeekActiveDays: 1 },
      });

      const activeResult = await analyzer.getHealthScore(active);
      const inactiveResult = await analyzer.getHealthScore(inactive);

      expect(inactiveResult.dimensions.activity).toBeLessThan(
        activeResult.dimensions.activity,
      );
    });
  });

  describe('getSuggestions', () => {
    it('应该对有孤立笔记的库生成警告', async () => {
      const snapshot = createMockSnapshot({
        health: { score: 70, orphanNotes: 5, brokenLinks: 0, brokenEmbeds: 0, lastWeekActiveDays: 7 },
      });
      const suggestions = await analyzer.getSuggestions(snapshot);
      expect(suggestions.some((s) => s.type === 'warning')).toBe(true);
    });

    it('应该对低活跃度生成提示', async () => {
      const snapshot = createMockSnapshot({
        health: { score: 70, orphanNotes: 0, brokenLinks: 0, brokenEmbeds: 0, lastWeekActiveDays: 1 },
      });
      const suggestions = await analyzer.getSuggestions(snapshot);
      expect(suggestions.some((s) => s.type === 'tip')).toBe(true);
    });

    it('健康库应无警告', async () => {
      const snapshot = createMockSnapshot({
        health: { score: 95, orphanNotes: 0, brokenLinks: 0, brokenEmbeds: 0, lastWeekActiveDays: 7 },
      });
      const suggestions = await analyzer.getSuggestions(snapshot);
      expect(suggestions.filter((s) => s.type === 'warning').length).toBe(0);
    });
  });

  describe('getTagAnalysis', () => {
    it('应该聚合多库标签', async () => {
      const snapshots = new Map<string, VaultSnapshot>();
      snapshots.set('v1', createMockSnapshot({ vaultId: 'v1', tags: { shared: 10, only_v1: 5 } }));
      snapshots.set('v2', createMockSnapshot({ vaultId: 'v2', tags: { shared: 8, only_v2: 3 } }));

      const analysis = await analyzer.getTagAnalysis(snapshots);
      expect(analysis.global.length).toBeGreaterThan(0);
      expect(analysis.overlap.length).toBeGreaterThan(0);
      expect(analysis.overlap.some((t) => t.tag === 'shared')).toBe(true);
    });
  });

  describe('getTrends', () => {
    it('应该返回空趋势数据', async () => {
      const trends = await analyzer.getTrends({ range: '7d', granularity: 'day' });
      expect(trends.labels).toEqual([]);
      expect(trends.datasets).toEqual([]);
    });
  });
});
