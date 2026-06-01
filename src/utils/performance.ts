interface Measure {
  label: string;
  duration: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();
  private measures: Measure[] = [];
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  start(label: string): void {
    this.marks.set(label, performance.now());
  }

  end(label: string): number {
    const start = this.marks.get(label);
    if (!start) return 0;
    const duration = performance.now() - start;
    this.measures.push({ label, duration, timestamp: Date.now() });
    this.marks.delete(label);

    if (this.debug) {
      console.debug(`[VC Perf] ${label}: ${duration.toFixed(1)}ms`);
    }
    return duration;
  }

  average(label: string): string {
    const entries = this.measures.filter(m => m.label === label);
    if (entries.length === 0) return '-';
    const avg = entries.reduce((s, e) => s + e.duration, 0) / entries.length;
    return `${avg.toFixed(1)}ms`;
  }

  getReport(): string {
    return [
      `┌─────────────────────┬──────────┐`,
      `│ 指标                │ 平均耗时  │`,
      `├─────────────────────┼──────────┤`,
      `│ 插件加载 → 就绪      │ ${this.average('plugin:load').padEnd(8)} │`,
      `│ Phase 1 元数据扫描   │ ${this.average('scan:phase1').padEnd(8)} │`,
      `│ Phase 2 内容索引     │ ${this.average('scan:phase2').padEnd(8)} │`,
      `│ 增量扫描            │ ${this.average('scan:incremental').padEnd(8)} │`,
      `│ 搜索响应            │ ${this.average('search:query').padEnd(8)} │`,
      `└─────────────────────┴──────────┘`,
    ].join('\n');
  }

  export(): Measure[] {
    return [...this.measures];
  }
}
