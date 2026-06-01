import { describe, it, expect } from 'vitest';
import { LinkParser } from '../../src/utils/link-parser';

describe('LinkParser', () => {
  describe('parse', () => {
    it('应该正确统计 wikilinks 数量', () => {
      const content = '[[note1]] and [[note2]] and [[note3]]';
      const result = LinkParser.parse(content);
      expect(result.links.outgoing).toBe(3);
    });

    it('应该正确统计嵌入数量', () => {
      const content = '![[image.png]] and ![[audio.mp3]]';
      const result = LinkParser.parse(content);
      expect(result.embeds.images).toBe(1);
      expect(result.embeds.audio).toBe(1);
      expect(result.embeds.total).toBe(2);
    });

    it('应该处理空内容', () => {
      const result = LinkParser.parse('');
      expect(result.links.outgoing).toBe(0);
      expect(result.embeds.total).toBe(0);
    });
  });

  describe('extractLinks', () => {
    it('应该提取所有 wikilink 目标', () => {
      const content = '[[note1]] [[note2]]';
      const links = LinkParser.extractLinks(content);
      expect(links).toEqual(['note1', 'note2']);
    });

    it('应该返回空数组当没有链接时', () => {
      expect(LinkParser.extractLinks('no links here')).toEqual([]);
    });
  });
});
