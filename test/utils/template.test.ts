import { describe, it, expect } from 'vitest';
import { TemplateEngine } from '../../src/utils/template';

describe('TemplateEngine', () => {
  describe('render', () => {
    it('应该替换占位符', () => {
      const template = '# {{title}}\n创建于: {{date}}';
      const result = TemplateEngine.render(template, {
        title: '测试笔记',
        date: '2026-06-01',
      });
      expect(result).toBe('# 测试笔记\n创建于: 2026-06-01');
    });

    it('应该保留未识别的占位符', () => {
      const result = TemplateEngine.render('{{title}} {{unknown}}', {
        title: '测试',
      });
      expect(result).toBe('测试 {{unknown}}');
    });

    it('应该处理空模板', () => {
      const result = TemplateEngine.render('', {});
      expect(result).toBe('');
    });
  });

  describe('getDefaultVariables', () => {
    it('应该返回包含 title 和日期时间的变量', () => {
      const vars = TemplateEngine.getDefaultVariables('我的笔记');
      expect(vars.title).toBe('我的笔记');
      expect(vars.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(vars.time).toMatch(/^\d{2}:\d{2}$/);
      expect(vars.datetime).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
  });
});
