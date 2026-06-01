export interface SearchNoteEntry {
  id: string;
  vaultId: string;
  fileName: string;
  fullPath: string;
  content: string;
  tags: string[];
  title: string;
  size: number;
}

export interface SearchParams {
  query: string;
  vaultIds?: string[];
  mode: 'filename' | 'content' | 'tag' | 'regex';
  maxResults?: number;
  caseSensitive?: boolean;
}

export interface SearchResult {
  vaultId: string;
  vaultName: string;
  fileName: string;
  fullPath: string;
  title: string;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  line: number;
  content: string;
  highlights: [number, number][];
}
