import ImportModalComponent from './ui/ImportModal.svelte';
import type VaultCommanderPlugin from '../main';

export class ImportModal {
  private component: ImportModalComponent | null = null;
  private container: HTMLDivElement | null = null;

  constructor(private plugin: VaultCommanderPlugin) {}

  open(): void {
    this.close();

    const externalVaults = this.plugin.settings.vaults.filter(v => v.isEnabled);
    if (externalVaults.length === 0) {
      new (require('obsidian').Notice)('请先在设置中添加外库');
      return;
    }

    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    this.component = new ImportModalComponent({
      target: this.container,
      props: {
        visible: true,
        vaults: externalVaults.map(v => ({ id: v.id, name: v.name, path: v.path })),
        getFiles: async (vaultId: string) => {
          const vault = this.plugin.settings.vaults.find(v => v.id === vaultId);
          if (!vault) return [];
          const snapshot = this.plugin.scanner.getSnapshot(vaultId);
          if (snapshot?.recentChanges) {
            return snapshot.recentChanges
              .filter(c => (c as any).fileName)
              .map(c => ({ path: c.fileName, title: c.title, size: c.size }));
          }
          // Fallback: read dir
          try {
            const fs = require('fs');
            const path = require('path');
            const files: Array<{ path: string; title: string; size: number }> = [];
            async function walk(dir: string) {
              const entries = await fs.promises.readdir(dir, { withFileTypes: true });
              for (const e of entries) {
                const fp = path.join(dir, e.name);
                const rp = path.relative(vault!.path, fp).replace(/\\/g, '/');
                if (e.name.startsWith('.')) continue;
                if (e.isDirectory()) { await walk(fp); }
                else if (e.isFile() && e.name.endsWith('.md')) {
                  const st = await fs.promises.stat(fp);
                  files.push({ path: rp, title: e.name.replace('.md', ''), size: st.size });
                }
              }
            }
            await walk(vault.path);
            return files.sort((a, b) => a.title.localeCompare(b.title));
          } catch {
            return [];
          }
        },
        getFolders: (_vaultId: string) => {
          const app = this.plugin.app;
          const folders = new Set<string>(['/']);
          for (const f of app.vault.getMarkdownFiles()) {
            const d = f.parent?.path ?? '/';
            folders.add(d);
          }
          return Promise.resolve([...folders].sort());
        },
        onImport: async (params: { sourceVaultId: string; sourceFile: string; targetFolder: string; fileName: string }) => {
          return this.plugin.dispatcher.importNote(params);
        },
        onClose: () => this.close(),
      },
    });
  }

  close(): void {
    this.component?.$destroy();
    this.component = null;
    this.container?.remove();
    this.container = null;
  }
}
