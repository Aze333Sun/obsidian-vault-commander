import type {
  HealthScore,
  TrendData,
  TrendParams,
  TagAnalysis,
  Suggestion,
} from '../types/analyzer';
import type { VaultSnapshot } from '../types/snapshot';

export class InsightsAnalyzer {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_cache: unknown) {}

  async getHealthScore(snapshot: VaultSnapshot): Promise<HealthScore> {
    const activity = Math.min((snapshot.health.lastWeekActiveDays / 7) * 100, 100);
    const linkIntegrity =
      snapshot.totalNotes > 0 ? (1 - snapshot.health.orphanNotes / snapshot.totalNotes) * 100 : 100;
    const structure =
      snapshot.totalNotes > 0
        ? Math.min((snapshot.totalFolders / snapshot.totalNotes) * 200, 100)
        : 100;
    const avgDaily = snapshot.stats.modified7d / 7;
    const updateFrequency = Math.min((avgDaily / 5) * 100, 100);

    return {
      vaultId: snapshot.vaultId,
      vaultName: '',
      overall: Math.round(
        activity * 0.3 + linkIntegrity * 0.3 + structure * 0.2 + updateFrequency * 0.2,
      ),
      dimensions: {
        activity: Math.round(activity),
        linkIntegrity: Math.round(linkIntegrity),
        structure: Math.round(structure),
        updateFrequency: Math.round(updateFrequency),
      },
    };
  }

  async getTrends(_params: TrendParams): Promise<TrendData> {
    // Phase 4 implementation
    return {
      labels: [],
      datasets: [],
    };
  }

  async getTagAnalysis(snapshots: Map<string, VaultSnapshot>): Promise<TagAnalysis> {
    const global: Array<{ tag: string; count: number }> = [];
    const byVault: Record<string, Array<{ tag: string; count: number }>> = {};
    const tagVaults: Record<string, { vaults: Set<string>; totalCount: number }> = {};

    for (const [vaultId, snapshot] of snapshots) {
      byVault[vaultId] = [];
      for (const [tag, count] of Object.entries(snapshot.tags)) {
        global.push({ tag, count });
        byVault[vaultId].push({ tag, count });

        if (!tagVaults[tag]) {
          tagVaults[tag] = { vaults: new Set(), totalCount: 0 };
        }
        tagVaults[tag].vaults.add(vaultId);
        tagVaults[tag].totalCount += count;
      }
    }

    const overlap = Object.entries(tagVaults)
      .filter(([, info]) => info.vaults.size > 1)
      .map(([tag, info]) => ({
        tag,
        vaults: [...info.vaults],
        totalCount: info.totalCount,
      }));

    return { global, byVault, overlap };
  }

  async getSuggestions(snapshot: VaultSnapshot): Promise<Suggestion[]> {
    const suggestions: Suggestion[] = [];

    if (snapshot.health.orphanNotes > 0) {
      suggestions.push({
        type: 'warning',
        message: `${snapshot.health.orphanNotes} 个孤立笔记没有链接`,
        vaultId: snapshot.vaultId,
      });
    }

    if (snapshot.health.brokenLinks > 0) {
      suggestions.push({
        type: 'warning',
        message: `${snapshot.health.brokenLinks} 个断链需要修复`,
        vaultId: snapshot.vaultId,
      });
    }

    if (snapshot.health.lastWeekActiveDays < 3) {
      suggestions.push({
        type: 'tip',
        message: '上周活跃天数较少，建议定期回顾笔记',
        vaultId: snapshot.vaultId,
      });
    }

    return suggestions;
  }
}
