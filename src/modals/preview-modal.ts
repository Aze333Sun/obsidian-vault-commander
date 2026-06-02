import NotePreviewModalComponent from './ui/NotePreviewModal.svelte';
import type VaultCommanderPlugin from '../main';

export class NotePreviewModal {
  private component: NotePreviewModalComponent | null = null;
  private container: HTMLDivElement | null = null;

  constructor(private plugin: VaultCommanderPlugin) {}

  async open(vaultId: string, filePath: string): Promise<void> {
    // Close existing
    this.close();

    const vaultConfig = this.plugin.settings.vaults.find((v) => v.id === vaultId)
      || (vaultId === '__host__' ? this.plugin.scanner.getHostVaultConfig() : null);

    if (!vaultConfig) {
      new (require('obsidian').Notice)('未找到目标库');
      return;
    }

    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    const title = filePath.split(/[/\\]/).pop()?.replace(/\.md$/i, '') || filePath;

    this.component = new NotePreviewModalComponent({
      target: this.container,
      props: {
        visible: true,
        title,
        vaultName: vaultConfig.name,
        filePath,
        content: '',
        loading: true,
        error: null,
        onClose: () => this.close(),
        onOpenInVault: () => {
          const vaultName = vaultConfig.path.split(/[/\\]/).filter(Boolean).pop() || vaultConfig.name;
          const uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
          window.open(uri, '_blank');
        },
      },
    });

    // Load content
    try {
      const fs = require('fs');
      const nodePath = require('path');
      const fullPath = nodePath.join(vaultConfig.path, filePath);
      const raw = await fs.promises.readFile(fullPath, 'utf-8');
      this.component.$set({ content: raw, loading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.component.$set({ error: msg, loading: false });
    }
  }

  close(): void {
    this.component?.$destroy();
    this.component = null;
    this.container?.remove();
    this.container = null;
  }
}
