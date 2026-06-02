import DispatchModalComponent from './ui/DispatchModal.svelte';
import type VaultCommanderPlugin from '../main';

export class DispatchModal {
  private component: DispatchModalComponent | null = null;
  private container: HTMLDivElement | null = null;

  constructor(private plugin: VaultCommanderPlugin) {}

  open(): void {
    if (this.container) return;

    const activeFile = this.plugin.app.workspace.getActiveFile();
    if (!activeFile) {
      new (require('obsidian').Notice)('请先打开一个笔记');
      return;
    }

    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    this.component = new DispatchModalComponent({
      target: this.container,
      props: {
        visible: true,
        sourceName: activeFile.path,
        sourceContent: '', // Will be loaded async
        vaults: this.plugin.settings.vaults
          .filter((v) => v.isEnabled)
          .map((v) => ({ id: v.id, name: v.name, path: v.path })),
        getFolders: (vaultId: string) => this.plugin.dispatcher.getFolders(vaultId),
        onDispatch: async (params: {
            targetVaultId: string;
            targetFolder: string;
            fileName: string;
            content: string;
          }) => {
          return this.plugin.dispatcher.dispatchNote(params);
        },
        onClose: () => this.close(),
      },
    });

    // Load content async
    this.plugin.app.vault.read(activeFile).then((content) => {
      this.component?.$set({ sourceContent: content });
    });
  }

  close(): void {
    this.component?.$destroy();
    this.component = null;
    this.container?.remove();
    this.container = null;
  }
}
