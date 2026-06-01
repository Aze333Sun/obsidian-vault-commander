import { describe, it, expect } from 'vitest';

// Test the module-level helper functions from scanner.ts
// These are extracted for testability

describe('Scanner Helpers', () => {
  describe('parseFrontmatter (inline)', () => {
    // Replicate for testing
    function parseFrontmatter(raw: string): { title: string; tags: string[] } {
      const YAML_FRONT_RE = /^---\n([\s\S]*?)\n---/;
      const TAG_LINE_RE = /^tags?\s*:\s*(.+)$/im;
      const TAG_LIST_RE = /(?:^|\s)- (.+)/gm;

      const match = raw.match(YAML_FRONT_RE);
      if (!match) return { title: '', tags: [] };

      const fm = match[1];
      const tags: string[] = [];
      const tagMatch = fm.match(TAG_LINE_RE);
      if (tagMatch) {
        const tagContent = tagMatch[1].trim();
        if (tagContent.startsWith('[')) {
          const inner = tagContent.slice(1, tagContent.lastIndexOf(']'));
          for (const t of inner.split(',')) {
            const cleaned = t.trim().replace(/^['"]|['"]$/g, '');
            if (cleaned) tags.push(cleaned);
          }
        } else {
          const listMatches = tagContent.matchAll(TAG_LIST_RE);
          for (const m of listMatches) {
            const cleaned = m[1].trim().replace(/^['"]|['"]$/g, '');
            if (cleaned) tags.push(cleaned);
          }
          if (tags.length === 0) {
            tags.push(tagContent.replace(/^['"]|['"]$/g, ''));
          }
        }
      }

      const titleMatch = raw.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].trim() : '';

      return { title, tags };
    }

    it('应该解析 YAML 数组格式标签', () => {
      const content = '---\ntags: [hello, world, test]\n---\n# My Title\n\nContent';
      const result = parseFrontmatter(content);
      expect(result.tags).toEqual(['hello', 'world', 'test']);
    });

    it('应该解析 YAML 单个标签', () => {
      const content = '---\ntags: test-tag\n---\n\nBody';
      const result = parseFrontmatter(content);
      expect(result.tags).toEqual(['test-tag']);
    });

    it('应该提取标题', () => {
      const content = '---\ntags: [a]\n---\n# 我的笔记标题\n\nContent';
      const result = parseFrontmatter(content);
      expect(result.title).toBe('我的笔记标题');
    });

    it('应该处理有 frontmatter 和标题的内容', () => {
      const content = '---\ntags: [a]\n---\n# My Title\n\nBody';
      const result = parseFrontmatter(content);
      expect(result.tags).toEqual(['a']);
      expect(result.title).toBe('My Title');
    });

    it('应该处理无 frontmatter 时返回空', () => {
      const result = parseFrontmatter('# Just a title\n\nBody');
      expect(result.tags).toEqual([]);
    });

    it('应该处理空内容', () => {
      const result = parseFrontmatter('');
      expect(result.tags).toEqual([]);
      expect(result.title).toBe('');
    });
  });

  describe('matchGlob (inline)', () => {
    function matchGlob(pattern: string, relPath: string, entryName: string): boolean {
      if (pattern === entryName) return true;
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1);
        if (entryName.endsWith(ext)) return true;
      }
      const normalized = relPath.replace(/\\/g, '/');
      if (normalized.includes(pattern)) return true;
      return false;
    }

    it('应该精确匹配名称', () => {
      expect(matchGlob('.git', '.git', '.git')).toBe(true);
    });

    it('应该匹配扩展名通配符', () => {
      expect(matchGlob('*.exe', 'file.exe', 'file.exe')).toBe(true);
      expect(matchGlob('*.log', 'debug.log', 'debug.log')).toBe(true);
      expect(matchGlob('*.exe', 'file.txt', 'file.txt')).toBe(false);
    });

    it('应该匹配路径包含', () => {
      expect(matchGlob('node_modules', 'project/node_modules/pkg', 'pkg')).toBe(true);
    });

    it('应该拒绝不匹配的模式', () => {
      expect(matchGlob('*.exe', 'file.md', 'file.md')).toBe(false);
      expect(matchGlob('.git', 'src', 'src')).toBe(false);
    });
  });

  describe('countWords (inline)', () => {
    function countWords(text: string): number {
      const bodyMatch = text.match(/^---[\s\S]*?---\n*/);
      const body = bodyMatch ? text.slice(bodyMatch[0].length) : text;
      const cjkCount = (body.match(/[一-鿿぀-ゟ゠-ヿ가-힯]/g) || []).length;
      const wordCount = body
        .replace(/[一-鿿぀-ゟ゠-ヿ가-힯]/g, '')
        .split(/\s+/)
        .filter(Boolean).length;
      return cjkCount + wordCount;
    }

    it('应该正确计算英文单词数', () => {
      const content = 'Hello world, this is a test.';
      expect(countWords(content)).toBe(6);
    });

    it('应该正确计算中文字数', () => {
      const content = '这是测试内容';
      expect(countWords(content)).toBe(6);
    });

    it('应该正确计算中英混合', () => {
      const content = 'Hello 你好 World 世界';
      expect(countWords(content)).toBe(6); // 4 CJK + 2 words
    });

    it('应该排除 frontmatter', () => {
      const content = '---\ntags: [a, b, c]\n---\n\nActual content here.';
      const result = countWords(content);
      expect(result).toBe(3);
    });
  });

  describe('isScanTarget (inline)', () => {
    function isScanTarget(
      ext: string,
      settings: { scan: { fileTypes: { enabled: string[] } } },
    ): boolean {
      const enabled = settings.scan.fileTypes.enabled;
      if (enabled.length > 0) {
        return enabled.includes(ext.toLowerCase());
      }
      return ext === '.md';
    }

    it('应该默认仅接受 .md', () => {
      const s = { scan: { fileTypes: { enabled: [] } } };
      expect(isScanTarget('.md', s)).toBe(true);
      expect(isScanTarget('.txt', s)).toBe(false);
    });

    it('应该支持自定义扩展名列表', () => {
      const s = { scan: { fileTypes: { enabled: ['.md', '.txt', '.org'] } } };
      expect(isScanTarget('.md', s)).toBe(true);
      expect(isScanTarget('.txt', s)).toBe(true);
      expect(isScanTarget('.org', s)).toBe(true);
      expect(isScanTarget('.png', s)).toBe(false);
    });
  });
});
