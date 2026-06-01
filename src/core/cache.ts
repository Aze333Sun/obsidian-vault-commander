import type { VaultSnapshot } from '../types/snapshot';

interface CacheDB {
  getAll(store: string): Promise<VaultSnapshot[]>;
  put(store: string, value: VaultSnapshot): Promise<void>;
  delete(store: string, key: string): Promise<void>;
}

export class VaultCache {
  private snapshots: Map<string, VaultSnapshot> = new Map();
  private db: CacheDB | null = null;
  async initialize(): Promise<void> {
    this.snapshots.clear();

    try {
      const { get, set, del, keys } = await import('idb-keyval');
      this.db = {
        getAll: async (store: string) => {
          const allKeys = await keys();
          const results: VaultSnapshot[] = [];
          for (const k of allKeys) {
            if (typeof k === 'string' && k.startsWith(`${store}:`)) {
              const val = await get(k);
              if (val) results.push(val as VaultSnapshot);
            }
          }
          return results;
        },
        put: async (store: string, value: VaultSnapshot) => {
          await set(`${store}:${value.vaultId}`, value);
        },
        delete: async (store: string, key: string) => {
          await del(`${store}:${key}`);
        },
      };

      const stored = await this.db.getAll('vaultSnapshots');
      for (const s of stored) {
        this.snapshots.set(s.vaultId, s);
      }
    } catch {
      console.warn('[VC] IndexedDB 不可用，使用内存缓存');
    }

    // initialized
  }

  getSnapshot(vaultId: string): VaultSnapshot | null {
    return this.snapshots.get(vaultId) ?? null;
  }

  getAllSnapshots(): Map<string, VaultSnapshot> {
    return new Map(this.snapshots);
  }

  async setSnapshot(vaultId: string, snapshot: VaultSnapshot): Promise<void> {
    this.snapshots.set(vaultId, snapshot);
    if (this.db) {
      await this.db.put('vaultSnapshots', snapshot);
    }
  }

  async persistAll(snapshots: Map<string, VaultSnapshot>): Promise<void> {
    for (const [vaultId, snapshot] of snapshots) {
      this.snapshots.set(vaultId, snapshot);
      if (this.db) {
        await this.db.put('vaultSnapshots', snapshot);
      }
    }
  }

  async removeVault(vaultId: string): Promise<void> {
    this.snapshots.delete(vaultId);
    if (this.db) {
      await this.db.delete('vaultSnapshots', vaultId);
    }
  }

  getSnapshotCount(): number {
    return this.snapshots.size;
  }

  async flush(): Promise<void> {
    // All writes are immediate with idb-keyval
  }
}
