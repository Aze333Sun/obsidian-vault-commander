import * as path from 'path';

export class PathUtils {
  static normalize(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  static join(...segments: string[]): string {
    return this.normalize(path.join(...segments));
  }

  static dirname(filePath: string): string {
    return this.normalize(path.dirname(filePath));
  }

  static basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  static extname(filePath: string): string {
    return path.extname(filePath).toLowerCase();
  }

  static relative(from: string, to: string): string {
    return this.normalize(path.relative(from, to));
  }

  static absolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  static isValidFileName(name: string): boolean {
    const invalid = /[<>:"/\\|?*\x00-\x1f]/g;
    return !invalid.test(name) && name.length > 0 && name.length <= 255;
  }

  static sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 255);
  }
}
