import * as path from 'path';
import * as fs from 'fs';
import type { VaultConfig } from '../types/settings';
import type VaultCommanderPlugin from '../main';
import { TemplateEngine } from '../utils/template';

export interface CreateNoteParams {
  title: string;
  targetVaultId: string;
  targetFolder: string;
  templateId?: string;
  onConflict: 'cancel' | 'rename' | 'overwrite';
  openAfterCreate: boolean;
}

export interface CreateNoteResult {
  success: boolean;
  vaultId: string;
  filePath: string;
  error?: string;
}

export class NoteDispatcher {
  constructor(private plugin: VaultCommanderPlugin) {}

  async createNote(params: CreateNoteParams): Promise<CreateNoteResult> {
    const vault = this.plugin.settings.vaults.find((v: { id: string }) => v.id === params.targetVaultId);
    if (!vault) {
      return { success: false, vaultId: params.targetVaultId, filePath: '', error: '库未找到' };
    }

    const safeName = this.sanitizeFileName(params.title);
    const relativePath = path.join(params.targetFolder, `${safeName}.md`);
    const fullPath = path.join(vault.path, relativePath);

    try {
      await fs.promises.access(fullPath);
      if (params.onConflict === 'cancel') {
        return { success: false, vaultId: params.targetVaultId, filePath: '', error: 'FILE_EXISTS' };
      }
      if (params.onConflict === 'rename') {
        const renamed = await this.resolveConflict(fullPath);
        return this.writeNote(vault, path.relative(vault.path, renamed), params);
      }
    } catch {
      // File doesn't exist, proceed
    }

    return this.writeNote(vault, relativePath, params);
  }

  private async writeNote(
    vault: VaultConfig,
    relativePath: string,
    params: CreateNoteParams,
  ): Promise<CreateNoteResult> {
    let content = '';
    if (params.templateId) {
      content = await this.loadTemplate(vault, params.templateId);
    }
    content = TemplateEngine.render(content || '', TemplateEngine.getDefaultVariables(params.title));

    const fullPath = path.join(vault.path, relativePath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, content, 'utf-8');

    this.plugin.eventBus.emit('note:created', {
      vaultId: vault.id,
      filePath: relativePath,
      title: params.title,
    });

    if (params.openAfterCreate) {
      await this.jumpToNote(vault, relativePath);
    }

    return { success: true, vaultId: vault.id, filePath: fullPath };
  }

  private async loadTemplate(vault: VaultConfig, templateId: string): Promise<string> {
    const templatePath = vault.templateFolder
      ? path.join(vault.path, vault.templateFolder, templateId)
      : path.join(vault.path, templateId);

    try {
      return await fs.promises.readFile(templatePath, 'utf-8');
    } catch {
      return '';
    }
  }

  async jumpToNote(vault: VaultConfig, relativePath: string): Promise<void> {
    const uri = `obsidian://open?vault=${encodeURIComponent(vault.name)}&file=${encodeURIComponent(relativePath)}`;
    window.open(uri, '_blank');
  }

  async openVault(vaultId: string): Promise<void> {
    const vault = this.plugin.settings.vaults.find((v: { id: string }) => v.id === vaultId);
    if (!vault) return;
    const uri = `obsidian://open?vault=${encodeURIComponent(vault.name)}`;
    window.open(uri, '_blank');
  }

  private async resolveConflict(fullPath: string): Promise<string> {
    const dir = path.dirname(fullPath);
    const ext = path.extname(fullPath);
    const base = path.basename(fullPath, ext);
    let counter = 1;
    let newPath: string;

    do {
      newPath = path.join(dir, `${base} (${counter})${ext}`);
      counter++;
    } while (await this.fileExists(newPath));

    return newPath;
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 255);
  }
}
