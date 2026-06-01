export interface TrendParams {
  vaultId?: string;
  range: '7d' | '30d' | '90d';
  granularity: 'day' | 'week';
}

export interface TrendData {
  labels: string[];
  datasets: TrendDataset[];
}

export interface TrendDataset {
  vaultId: string;
  vaultName: string;
  data: number[];
  color: string;
}

export interface HealthScore {
  vaultId: string;
  vaultName: string;
  overall: number;
  dimensions: {
    activity: number;
    linkIntegrity: number;
    structure: number;
    updateFrequency: number;
  };
}

export interface Suggestion {
  type: 'warning' | 'info' | 'tip';
  message: string;
  vaultId?: string;
  action?: SuggestionAction;
}

export interface SuggestionAction {
  label: string;
  command: string;
  params?: Record<string, string>;
}

export interface TagAnalysis {
  global: Array<{ tag: string; count: number }>;
  byVault: Record<string, Array<{ tag: string; count: number }>>;
  overlap: Array<{
    tag: string;
    vaults: string[];
    totalCount: number;
  }>;
}
