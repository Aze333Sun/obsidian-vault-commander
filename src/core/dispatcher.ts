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

  // ─── 文件夹列表 ──────────────────────────────────

  async getFolders(vaultId: string): Promise<string[]> {
    const vault = this.plugin.settings.vaults.find((v: { id: string }) => v.id === vaultId);
    if (!vault) return [];

    const folders = new Set<string>();
    folders.add('/');

    try {
      const entries = await fs.promises.readdir(vault.path, {
        withFileTypes: true,
        recursive: true,
      });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const p = entry.path || (entry as any).parentPath + '/' + entry.name;
          const rel = '/' + path.relative(vault.path, p).replace(/\\/g, '/');
          if (!rel.startsWith('.')) {
            folders.add(rel);
          }
        }
      }
    } catch {
      // Fall back to just root
    }

    return [...folders].sort();
  }

  // ─── 模板列表 ────────────────────────────────────

  async getTemplates(vaultId: string): Promise<Array<{ name: string; path: string }>> {
    const vault = this.plugin.settings.vaults.find((v: { id: string }) => v.id === vaultId);
    if (!vault) return [];

    const templateDir = vault.templateFolder
      ? path.join(vault.path, vault.templateFolder)
      : path.join(vault.path, 'Templates');

    try {
      const entries = await fs.promises.readdir(templateDir, {
        withFileTypes: true,
      });
      return entries
        .filter((e) => e.isFile() && e.name.endsWith('.md'))
        .map((e) => ({
          name: e.name.replace('.md', ''),
          path: vault.templateFolder ? `${vault.templateFolder}/${e.name}` : `Templates/${e.name}`,
        }));
    } catch {
      return [];
    }
  }

  // ─── 新建笔记 ────────────────────────────────────

  async createNote(params: CreateNoteParams): Promise<CreateNoteResult> {
    const vault = this.plugin.settings.vaults.find(
      (v: { id: string }) => v.id === params.targetVaultId,
    );
    if (!vault) {
      return { success: false, vaultId: params.targetVaultId, filePath: '', error: '库未找到' };
    }

    const safeName = this.sanitizeFileName(params.title);
    const relativePath = path.join(params.targetFolder, `${safeName}.md`);
    const fullPath = path.join(vault.path, relativePath);

    try {
      await fs.promises.access(fullPath);
      if (params.onConflict === 'cancel') {
        return {
          success: false,
          vaultId: params.targetVaultId,
          filePath: '',
          error: 'FILE_EXISTS',
        };
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
    content = TemplateEngine.render(
      content || '',
      TemplateEngine.getDefaultVariables(params.title),
    );

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
