export interface DebugEntry {
  time: number;
  level: 'log' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  data?: unknown;
}

export interface DebugEvent {
  time: number;
  event: string;
  payload: unknown;
}

export interface DebugReport {
  enabled: boolean;
  pluginVersion: string;
  logs: DebugEntry[];
  events: DebugEvent[];
  scanState: {
    isScanning: boolean;
    totalScans: number;
    failedScans: number;
    lastScanTime: number | null;
    lastScanDuration: number | null;
    lastScanVaults: number;
  };
  snapshotInfo: Array<{ vaultId: string; totalNotes: number; scannedAt: number }>;
  errors: string[];
  vaultConfigs: Array<{ id: string; name: string; path: string; isEnabled: boolean }>;
}

const MAX_LOGS = 200;
const MAX_EVENTS = 100;

export class DebugLogger {
  enabled = false;
  pluginVersion = '0.1.0';

  private logs: DebugEntry[] = [];
  private events: DebugEvent[] = [];
  private errors: string[] = [];
  private originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
  } | null = null;

  scanState: DebugReport['scanState'] = {
    isScanning: false,
    totalScans: 0,
    failedScans: 0,
    lastScanTime: null,
    lastScanDuration: null,
    lastScanVaults: 0,
  };

  snapshotInfo: DebugReport['snapshotInfo'] = [];
  vaultConfigs: DebugReport['vaultConfigs'] = [];

  // ─── Console 拦截 ─────────────────────────────────

  captureConsole(): void {
    if (this.originalConsole) return;

    this.originalConsole = {
      log: console.log.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    const self = this;

    console.log = function (...args: unknown[]) {
      self.originalConsole!.log(...args);
      self.addLog('log', 'console', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    console.warn = function (...args: unknown[]) {
      self.originalConsole!.warn(...args);
      self.addLog('warn', 'console', args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
    };

    console.error = function (...args: unknown[]) {
      self.originalConsole!.error(...args);
      const msg = args.map((a) => (a instanceof Error ? a.message + (a.stack ? '\n' + a.stack : '') : typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      self.addLog('error', 'console', msg);
      self.errors.push(msg);
    };
  }

  releaseConsole(): void {
    if (this.originalConsole) {
      console.log = this.originalConsole.log;
      console.warn = this.originalConsole.warn;
      console.error = this.originalConsole.error;
      this.originalConsole = null;
    }
  }

  // ─── 日志 ─────────────────────────────────────────

  addLog(level: DebugEntry['level'], source: string, message: string, data?: unknown): void {
    if (!this.enabled && level !== 'error') return;

    this.logs.push({ time: Date.now(), level, source, message, data });
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(-MAX_LOGS);
    }
  }

  // ─── 事件追踪 ─────────────────────────────────────

  trackEvent(event: string, payload: unknown): void {
    if (!this.enabled) return;

    this.events.push({ time: Date.now(), event, payload });
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }

    // 自动追踪扫描相关事件
    if (event === 'scan:start') {
      const p = payload as { vaultIds: string[] };
      this.scanState.isScanning = true;
      this.scanState.lastScanVaults = p.vaultIds?.length ?? 0;
      this.addLog('debug', 'scan', `扫描开始: ${p.vaultIds?.length ?? 0} 个库`, payload);
    } else if (event === 'scan:complete') {
      const p = payload as { snapshots: Map<string, unknown> };
      this.scanState.isScanning = false;
      this.scanState.totalScans++;
      this.scanState.lastScanTime = Date.now();
      this.addLog('debug', 'scan', `扫描完成: ${p.snapshots?.size ?? 0} 个快照`, payload);
    } else if (event === 'scan:error') {
      const p = payload as { vaultId: string; error: Error };
      this.scanState.failedScans++;
      this.errors.push(`扫描库 ${p.vaultId} 失败: ${p.error?.message ?? String(p.error)}`);
      this.addLog('error', 'scan', `扫描失败: ${p.vaultId}`, p.error);
    }
  }

  // ─── 快照信息 ─────────────────────────────────────

  updateSnapshotInfo(snapshots: Map<string, { totalNotes: number; scannedAt: number }>): void {
    this.snapshotInfo = [];
    for (const [id, s] of snapshots) {
      this.snapshotInfo.push({ vaultId: id, totalNotes: s.totalNotes, scannedAt: s.scannedAt });
    }
  }

  updateVaultConfigs(configs: Array<{ id: string; name: string; path: string; isEnabled: boolean }>): void {
    this.vaultConfigs = configs;
  }

  // ─── 报告 ─────────────────────────────────────────

  getReport(): DebugReport {
    return {
      enabled: this.enabled,
      pluginVersion: this.pluginVersion,
      logs: [...this.logs],
      events: [...this.events],
      scanState: { ...this.scanState },
      snapshotInfo: [...this.snapshotInfo],
      errors: [...this.errors],
      vaultConfigs: [...this.vaultConfigs],
    };
  }

  clear(): void {
    this.logs = [];
    this.events = [];
    this.errors = [];
    this.snapshotInfo = [];
  }
}
