import { describe, it, expect } from 'vitest';
import { PathUtils } from '../../src/utils/path';

describe('PathUtils', () => {
  describe('normalize', () => {
    it('应该将反斜杠转换为正斜杠', () => {
      expect(PathUtils.normalize('folder\\subfolder\\file.md')).toBe('folder/subfolder/file.md');
    });

    it('应该保持正斜杠不变', () => {
      expect(PathUtils.normalize('folder/subfolder/file.md')).toBe('folder/subfolder/file.md');
    });
  });

  describe('isValidFileName', () => {
    it('应该接受合法的文件名', () => {
      expect(PathUtils.isValidFileName('note.md')).toBe(true);
      expect(PathUtils.isValidFileName('我的笔记')).toBe(true);
    });

    it('应该拒绝包含非法字符的文件名', () => {
      expect(PathUtils.isValidFileName('file:name.md')).toBe(false);
      expect(PathUtils.isValidFileName('file<name')).toBe(false);
      expect(PathUtils.isValidFileName('file?name')).toBe(false);
    });

    it('应该拒绝空文件名', () => {
      expect(PathUtils.isValidFileName('')).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('应该替换非法字符为连字符', () => {
      expect(PathUtils.sanitizeFileName('file:name.md')).toBe('file-name.md');
      expect(PathUtils.sanitizeFileName('a<b>c')).toBe('a-b-c');
    });
  });
});
