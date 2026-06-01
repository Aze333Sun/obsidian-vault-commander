import type { VaultConfig } from './settings';
import type { VaultSnapshot } from './snapshot';
import type { SearchResult } from './search';

export type VaultCommanderEvent =
  | { type: 'scan:start'; payload: { vaultIds: string[] } }
  | { type: 'scan:complete'; payload: { snapshots: Map<string, VaultSnapshot> } }
  | { type: 'scan:error'; payload: { vaultId: string; error: Error } }
  | { type: 'scan:progress'; payload: { vaultId: string; progress: number; message: string } }
  | { type: 'search:start'; payload: { query: string } }
  | { type: 'search:complete'; payload: { results: SearchResult[] } }
  | { type: 'note:created'; payload: { vaultId: string; filePath: string; title: string } }
  | { type: 'vault:added'; payload: { config: VaultConfig } }
  | { type: 'vault:removed'; payload: { vaultId: string } }
  | { type: 'vault:updated'; payload: { config: VaultConfig } };
