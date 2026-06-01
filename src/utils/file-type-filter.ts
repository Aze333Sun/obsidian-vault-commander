import * as path from 'path';

export class FileTypeFilter {
  static readonly ATTACHMENT_EXTENSIONS = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.webp',
    '.svg',
    '.ico',
    '.bmp',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
    '.flac',
    '.aac',
    '.mp4',
    '.mov',
    '.avi',
    '.mkv',
    '.webm',
    '.flv',
    '.zip',
    '.rar',
    '.7z',
    '.tar',
    '.gz',
    '.exe',
    '.dll',
    '.so',
    '.dmg',
    '.wasm',
  ]);

  static isNoteFile(filePath: string, enabledExtensions: string[]): boolean {
    const ext = path.extname(filePath).toLowerCase();
    if (enabledExtensions.length > 0) {
      return enabledExtensions.includes(ext);
    }
    return ext === '.md';
  }

  static normalizeExtension(input: string): string {
    const trimmed = input.trim().toLowerCase();
    return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
  }

  static isValidForScan(ext: string): { valid: boolean; reason?: string } {
    const normalized = this.normalizeExtension(ext);
    if (normalized === '.') {
      return { valid: false, reason: '扩展名不能为空' };
    }
    if (this.ATTACHMENT_EXTENSIONS.has(normalized)) {
      return { valid: false, reason: `${normalized} 是附件/二进制类型` };
    }
    if (/[^a-z0-9._-]/.test(normalized.slice(1))) {
      return { valid: false, reason: '扩展名包含不支持的字符' };
    }
    return { valid: true };
  }
}
