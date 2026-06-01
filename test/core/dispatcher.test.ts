import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../../src/utils/template';

describe('NoteDispatcher Helpers', () => {
  describe('TemplateEngine', () => {
    it('应该替换所有默认占位符', () => {
      const template = `---
title: "{{title}}"
date: "{{date}}"
time: "{{time}}"
---

# {{title}}

创建时间: {{datetime}}
`;
      const vars = TemplateEngine.getDefaultVariables('我的笔记');
      const result = TemplateEngine.render(template, vars);

      expect(result).toContain('我的笔记');
      expect(result).toContain(vars.date);
      expect(result).toContain(vars.datetime);
      expect(result).not.toContain('{{title}}');
      expect(result).not.toContain('{{date}}');
    });

    it('应该保留未识别的占位符', () => {
      const result = TemplateEngine.render('{{custom_field}}', {});
      expect(result).toBe('{{custom_field}}');
    });

    it('getDefaultVariables 应该生成正确的日期格式', () => {
      const vars = TemplateEngine.getDefaultVariables('Test');
      expect(vars.title).toBe('Test');
      expect(vars.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(vars.time).toMatch(/^\d{2}:\d{2}$/);
      expect(vars.datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });

  describe('sanitizeFileName', () => {
    function sanitizeFileName(name: string): string {
      return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').slice(0, 255);
    }

    it('应该替换非法字符', () => {
      expect(sanitizeFileName('note:1')).toBe('note-1');
      expect(sanitizeFileName('a<b>c')).toBe('a-b-c');
      expect(sanitizeFileName('test?file')).toBe('test-file');
    });

    it('应该限制最大长度', () => {
      const long = 'a'.repeat(300);
      expect(sanitizeFileName(long).length).toBe(255);
    });

    it('应该保留合法字符', () => {
      expect(sanitizeFileName('正常笔记名称_2026')).toBe('正常笔记名称_2026');
      expect(sanitizeFileName('note (1)')).toBe('note (1)');
    });
  });
});
