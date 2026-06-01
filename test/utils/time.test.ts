import { describe, it, expect } from 'vitest';
import { TimeUtils } from '../../src/utils/time';

describe('TimeUtils', () => {
  describe('formatDate', () => {
    it('应该格式化日期为 YYYY-MM-DD', () => {
      const date = new Date('2026-06-01T12:00:00Z');
      expect(TimeUtils.formatDate(date)).toBe('2026-06-01');
    });
  });

  describe('formatTime', () => {
    it('应该格式化时间为 HH:mm', () => {
      const date = new Date('2026-06-01T14:30:00');
      const result = TimeUtils.formatTime(date);
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('isWithin', () => {
    it('应该正确判断时间范围', () => {
      const now = Date.now();
      expect(TimeUtils.isWithin(now - 1000, 1)).toBe(true);
      expect(TimeUtils.isWithin(now - 7200000, 1)).toBe(false);
    });
  });
});
