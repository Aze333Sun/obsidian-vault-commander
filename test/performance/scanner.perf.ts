import { describe, it } from 'vitest';
import { PerformanceMonitor } from '../../src/utils/performance';

describe('Scanner Performance Monitor', () => {
  it('应该记录并报告性能指标', () => {
    const perf = new PerformanceMonitor(true);

    perf.start('scan:phase1');
    // Simulate work
    const start = Date.now();
    while (Date.now() - start < 10) {
      /* noop */
    }
    const duration = perf.end('scan:phase1');

    expect(duration).toBeGreaterThan(0);

    const report = perf.getReport();
    expect(report).toContain('scan:phase1');
  });
});
