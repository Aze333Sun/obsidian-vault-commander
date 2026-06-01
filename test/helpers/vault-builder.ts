import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export function createTempVaultStructure(
  files: Record<string, string | null>
): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-test-'));
  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(tmpDir, filePath);
    if (content === null) {
      fs.mkdirSync(fullPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
  }
  return tmpDir;
}

export function cleanupTempDir(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}
