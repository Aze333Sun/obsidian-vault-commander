import { describe, it, expect } from 'vitest';
import { FileTypeFilter } from '../../src/utils/file-type-filter';

describe('FileTypeFilter', () => {
  describe('isNoteFile', () => {
    it('应该识别 .md 为笔记文件', () => {
      expect(FileTypeFilter.isNoteFile('note.md', ['.md'])).toBe(true);
    });

    it('应该排除图片文件', () => {
      expect(FileTypeFilter.isNoteFile('photo.png', ['.md'])).toBe(false);
    });

    it('应该排除 PDF 文件', () => {
      expect(FileTypeFilter.isNoteFile('doc.pdf', ['.md'])).toBe(false);
    });

    it('应该支持自定义扩展名', () => {
      expect(FileTypeFilter.isNoteFile('data.txt', ['.md', '.txt'])).toBe(true);
      expect(FileTypeFilter.isNoteFile('data.csv', ['.md', '.txt'])).toBe(false);
    });

    it('默认仅支持 .md', () => {
      expect(FileTypeFilter.isNoteFile('note.md', [])).toBe(true);
      expect(FileTypeFilter.isNoteFile('data.txt', [])).toBe(false);
    });
  });

  describe('normalizeExtension', () => {
    it('应该给不含点的扩展名加点号', () => {
      expect(FileTypeFilter.normalizeExtension('txt')).toBe('.txt');
    });

    it('应该保持带点号的扩展名不变', () => {
      expect(FileTypeFilter.normalizeExtension('.md')).toBe('.md');
    });

    it('应该转换为小写', () => {
      expect(FileTypeFilter.normalizeExtension('.MD')).toBe('.md');
    });
  });

  describe('isValidForScan', () => {
    it('应该接受合法的文本扩展名', () => {
      expect(FileTypeFilter.isValidForScan('.txt').valid).toBe(true);
      expect(FileTypeFilter.isValidForScan('.org').valid).toBe(true);
    });

    it('应该拒绝附件扩展名', () => {
      const result = FileTypeFilter.isValidForScan('.png');
      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('应该拒绝空扩展名', () => {
      const result = FileTypeFilter.isValidForScan('');
      expect(result.valid).toBe(false);
    });
  });
});
