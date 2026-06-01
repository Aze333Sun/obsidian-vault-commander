import * as fs from 'fs';
import * as path from 'path';

export class CrossVaultFileSystem {
  async exists(vaultId: string, relativePath: string): Promise<boolean> {
    try {
      await fs.promises.access(this.resolvePath(vaultId, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async read(vaultId: string, relativePath: string): Promise<string> {
    const fullPath = this.resolvePath(vaultId, relativePath);
    return fs.promises.readFile(fullPath, 'utf-8');
  }

  async write(vaultId: string, relativePath: string, content: string): Promise<void> {
    const fullPath = this.resolvePath(vaultId, relativePath);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.promises.writeFile(fullPath, content, 'utf-8');
  }

  async stat(vaultId: string, relativePath: string): Promise<fs.Stats> {
    const fullPath = this.resolvePath(vaultId, relativePath);
    return fs.promises.stat(fullPath);
  }

  async readDir(vaultId: string, relativePath: string): Promise<fs.Dirent[]> {
    const fullPath = this.resolvePath(vaultId, relativePath);
    return fs.promises.readdir(fullPath, { withFileTypes: true });
  }

  private resolvePath(vaultId: string, relativePath: string): string {
    return path.join(vaultId, relativePath);
  }
}
