import NewNoteModalComponent from './ui/NewNoteModal.svelte';
import type VaultCommanderPlugin from '../main';

export class NewNoteModal {
  private component: NewNoteModalComponent | null = null;
  private container: HTMLDivElement | null = null;

  constructor(private plugin: VaultCommanderPlugin) {}

  open(): void {
    this.close();

    this.container = document.createElement('div');
    document.body.appendChild(this.container);

    const vaults = this.plugin.settings.vaults
      .filter((v) => v.isEnabled)
      .map((v) => ({ id: v.id, name: v.name }));

    this.component = new NewNoteModalComponent({
      target: this.container,
      props: {
        visible: true,
        vaults,
        onClose: () => this.close(),
        getFolders: async (vaultId: string) => {
          return this.plugin.dispatcher.getFolders(vaultId);
        },
        getTemplates: async (vaultId: string) => {
          const fsTemplates = await this.plugin.dispatcher.getTemplates(vaultId);
          const custom = (this.plugin.settings.templates.customTemplates || []).map((t) => ({
            name: t.name,
            path: `__custom__::${t.name}`,
          }));
          return [...custom, ...fsTemplates];
        },
        onCreate: async (params: {
          title: string;
          vaultId: string;
          folder: string;
          templateId?: string;
          openAfterCreate: boolean;
          onConflict: 'cancel' | 'rename' | 'overwrite';
        }) => {
          return this.plugin.dispatcher.createNote({
            title: params.title,
            targetVaultId: params.vaultId,
            targetFolder: params.folder,
            templateId: params.templateId,
            openAfterCreate: params.openAfterCreate,
            onConflict: params.onConflict,
          });
        },
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
