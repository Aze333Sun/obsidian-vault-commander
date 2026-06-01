import { describe, it, expect, afterAll } from 'vitest';
import { VaultCache } from '../../src/core/cache';
import { createTempVaultStructure, cleanupTempDir } from '../helpers/vault-builder';

describe('Scanner-Cache Integration Flow', () => {
  let tempDir: string;

  afterAll(() => {
    if (tempDir) {
      cleanupTempDir(tempDir);
    }
  });

  it('应该创建临时库结构并验证文件', () => {
    tempDir = createTempVaultStructure({
      'notes': null,
      'notes/note1.md': '---\ntags: [test]\n---\n# Note 1',
      'notes/note2.md': '# Note 2',
      'daily': null,
      'daily/2026-06-01.md': '---\ntitle: Daily Note\n---\nContent here',
    });

    const fs = require('fs');
    const path = require('path');

    expect(fs.existsSync(path.join(tempDir, 'notes', 'note1.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'notes', 'note2.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'daily', '2026-06-01.md'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'notes'))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, 'daily'))).toBe(true);
  });

  it('VaultCache 应该能正确初始化', async () => {
    const cache = new VaultCache();
    await cache.initialize();
    expect(cache.getSnapshotCount()).toBe(0);
  });
});
