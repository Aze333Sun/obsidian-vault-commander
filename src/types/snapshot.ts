export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  vaultId: string;
  vaultName: string;
  fileName: string;
  line: number;
  priority: number;
  dueDate: string | null;
  mtime: number;
}

export interface VaultSnapshot {
  vaultId: string;
  scannedAt: number;
  totalNotes: number;
  totalFolders: number;
  notesByFolder: Record<string, number>;
  tags: Record<string, number>;
  recentChanges: NoteChange[];
  tasks: TaskItem[];
  stats: VaultStats;
  health: HealthIndicators;
  isHost?: boolean;
}

export interface VaultStats {
  added24h: number;
  added7d: number;
  added30d: number;
  modified24h: number;
  modified7d: number;
  modified30d: number;
}

export interface HealthIndicators {
  score: number;
  orphanNotes: number;
  brokenLinks: number;
  brokenEmbeds: number;
  lastWeekActiveDays: number;
}

export interface NoteChange {
  vaultId: string;
  fileName: string;
  title: string;
  mtime: number;
  size: number;
  tags: string[];
  wordCount: number;
  links: {
    outgoing: number;
    incoming: number;
  };
  embeds: {
    images: number;
    audio: number;
    video: number;
    other: number;
    total: number;
    broken: number;
  };
  folder: string;
  isNew: boolean;
}

export interface CachedFileMeta {
  vaultId: string;
  filePath: string;
  mtime: number;
  size: number;
  tags: string[];
  links: string[];
  wordCount: number;
  cachedAt: number;
}
