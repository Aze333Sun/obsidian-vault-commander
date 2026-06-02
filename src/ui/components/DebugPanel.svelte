<script lang="ts">
  import type { DebugReport } from '../../utils/debug-logger';

  export let report: DebugReport | null = null;
  export let onClear: (() => void) | null = null;

  let expanded = false;
  let activeTab: 'overview' | 'events' | 'logs' | 'data' = 'overview';

  $: vaultCount = report?.vaultConfigs?.length ?? 0;
  $: snapshotCount = report?.snapshotInfo?.length ?? 0;
  $: eventCount = report?.events?.length ?? 0;
  $: errorCount = report?.errors?.length ?? 0;
  $: logCount = report?.logs?.length ?? 0;

  function toggleExpand(): void {
    expanded = !expanded;
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN') + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function levelColor(level: string): string {
    if (level === 'error') return 'var(--text-error)';
    if (level === 'warn') return 'var(--text-warning)';
    if (level === 'debug') return 'var(--text-faint)';
    return 'var(--text-normal)';
  }

  function copyReport(): void {
    if (!report) return;
    const json = JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(json).catch(() => {
      // Fallback: log to console so user can copy from devtools
      console.log('[Debug Report]', json);
    });
  }
</script>

{#if report?.enabled}
  <div class="vc-debug" class:vc-debug-expanded={expanded}>
    <!-- 折叠头 -->
    <button class="vc-debug-header" on:click={toggleExpand} type="button">
      <span class="vc-debug-indicator" class:vc-debug-has-error={errorCount > 0} />
      <span class="vc-debug-title">调试面板</span>
      <span class="vc-debug-summary">
        {vaultCount}库 · {snapshotCount}快照 · {eventCount}事件
        {#if errorCount > 0}
          · <span class="vc-debug-error-count">{errorCount} 错误</span>
        {/if}
      </span>
      <span class="vc-debug-arrow">{expanded ? '▼' : '▶'}</span>
    </button>

    {#if expanded}
      <div class="vc-debug-body">
        <!-- 标签栏 -->
        <div class="vc-debug-tabs">
          <button
            class="vc-debug-tab"
            class:active={activeTab === 'overview'}
            on:click={() => (activeTab = 'overview')}>概览</button
          >
          <button
            class="vc-debug-tab"
            class:active={activeTab === 'events'}
            on:click={() => (activeTab = 'events')}>事件 ({eventCount})</button
          >
          <button
            class="vc-debug-tab"
            class:active={activeTab === 'logs'}
            on:click={() => (activeTab = 'logs')}>日志 ({logCount})</button
          >
          <button
            class="vc-debug-tab"
            class:active={activeTab === 'data'}
            on:click={() => (activeTab = 'data')}>数据</button
          >
          <button class="vc-debug-copy" on:click={copyReport} type="button">复制报告</button>
          {#if onClear}
            <button class="vc-debug-clear" on:click={onClear} type="button">清空日志</button>
          {/if}
        </div>

        <!-- 概览 -->
        {#if activeTab === 'overview'}
          <div class="vc-debug-section">
            <h4>扫描状态</h4>
            <table class="vc-debug-table">
              <tr><td>扫描中</td><td>{report.scanState.isScanning ? '是' : '否'}</td></tr>
              <tr><td>总扫描次数</td><td>{report.scanState.totalScans}</td></tr>
              <tr><td>失败次数</td><td>{report.scanState.failedScans}</td></tr>
              <tr><td>最后扫描</td><td>{report.scanState.lastScanTime ? formatTime(report.scanState.lastScanTime) : '—'}</td></tr>
              <tr><td>最后耗时</td><td>{report.scanState.lastScanDuration != null ? report.scanState.lastScanDuration + 'ms' : '—'}</td></tr>
              <tr><td>扫描库数</td><td>{report.scanState.lastScanVaults}</td></tr>
            </table>

            <h4>已配置分库 ({vaultCount})</h4>
            {#if report.vaultConfigs.length > 0}
              <table class="vc-debug-table">
                {#each report.vaultConfigs as v}
                  <tr>
                    <td>{v.name}</td>
                    <td class="vc-debug-mono">{v.path}</td>
                    <td>{v.isEnabled ? '✅' : '⛔'}</td>
                  </tr>
                {/each}
              </table>
            {:else}
              <p class="vc-debug-empty">未配置任何分库</p>
            {/if}

            <h4>快照 ({snapshotCount})</h4>
            {#if report.snapshotInfo.length > 0}
              <table class="vc-debug-table">
                {#each report.snapshotInfo as s}
                  <tr>
                    <td class="vc-debug-mono">{s.vaultId}</td>
                    <td>{s.totalNotes} 笔记</td>
                    <td>{formatTime(s.scannedAt)}</td>
                  </tr>
                {/each}
              </table>
            {:else}
              <p class="vc-debug-empty">无快照数据</p>
            {/if}

            {#if errorCount > 0}
              <h4>
                错误 ({errorCount})
                {#if onClear}
                  <button class="vc-debug-clear-sm" on:click={onClear} type="button">清空</button>
                {/if}
              </h4>
              <div class="vc-debug-errors">
                {#each report.errors as err}
                  <pre class="vc-debug-error-item">{err}</pre>
                {/each}
              </div>
            {/if}
          </div>
        {/if}

        <!-- 事件日志 -->
        {#if activeTab === 'events'}
          <div class="vc-debug-section">
            {#if report.events.length > 0}
              <div class="vc-debug-list">
                {#each [...report.events].reverse() as evt}
                  <div class="vc-debug-list-item">
                    <span class="vc-debug-time">{formatTime(evt.time)}</span>
                    <span class="vc-debug-event-name">{evt.event}</span>
                    <pre class="vc-debug-payload">{JSON.stringify(evt.payload, null, 2)}</pre>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="vc-debug-empty">暂无事件</p>
            {/if}
          </div>
        {/if}

        <!-- 日志 -->
        {#if activeTab === 'logs'}
          <div class="vc-debug-section">
            {#if report.logs.length > 0}
              <div class="vc-debug-list">
                {#each [...report.logs].reverse() as log}
                  <div class="vc-debug-list-item" style="color: {levelColor(log.level)}">
                    <span class="vc-debug-time">{formatTime(log.time)}</span>
                    <span class="vc-debug-log-level">[{log.level.toUpperCase()}]</span>
                    <span class="vc-debug-log-source">{log.source}</span>
                    <span class="vc-debug-log-msg">{log.message}</span>
                    {#if log.data}
                      <pre class="vc-debug-payload">{JSON.stringify(log.data, null, 2)}</pre>
                    {/if}
                  </div>
                {/each}
              </div>
            {:else}
              <p class="vc-debug-empty">暂无日志</p>
            {/if}
          </div>
        {/if}

        <!-- 原始数据 -->
        {#if activeTab === 'data'}
          <div class="vc-debug-section">
            <h4>完整报告 (JSON)</h4>
            <pre class="vc-debug-raw">{JSON.stringify(report, null, 2)}</pre>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style>
  .vc-debug {
    margin: var(--size-4-2) 0;
    border: 1px solid var(--color-orange);
    border-radius: var(--radius-m);
    overflow: hidden;
    font-size: var(--font-smallest);
    font-family: var(--font-monospace);
  }
  .vc-debug-header {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    width: 100%;
    padding: var(--size-4-1) var(--size-4-2);
    background: var(--background-secondary);
    border: none;
    cursor: pointer;
    color: var(--text-normal);
    text-align: left;
  }
  .vc-debug-header:hover {
    background: var(--background-modifier-hover);
  }
  .vc-debug-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-green);
    flex-shrink: 0;
  }
  .vc-debug-has-error {
    background: var(--color-red);
  }
  .vc-debug-title {
    font-weight: 600;
    color: var(--color-orange);
  }
  .vc-debug-summary {
    flex: 1;
    color: var(--text-muted);
  }
  .vc-debug-error-count {
    color: var(--text-error);
    font-weight: 600;
  }
  .vc-debug-arrow {
    font-size: var(--font-smallest);
  }
  .vc-debug-body {
    border-top: 1px solid var(--background-modifier-border);
    max-height: 400px;
    overflow-y: auto;
  }
  .vc-debug-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--background-modifier-border);
    padding: 0 var(--size-4-1);
    background: var(--background-primary);
    position: sticky;
    top: 0;
    z-index: 1;
  }
  .vc-debug-tab {
    padding: var(--size-4-1) var(--size-4-2);
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    cursor: pointer;
    color: var(--text-muted);
    font-size: var(--font-smallest);
  }
  .vc-debug-tab:hover {
    color: var(--text-normal);
  }
  .vc-debug-tab.active {
    color: var(--text-accent);
    border-bottom-color: var(--text-accent);
  }
  .vc-debug-copy {
    margin-left: auto;
    padding: var(--size-4-1) var(--size-4-2);
    background: none;
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    cursor: pointer;
    color: var(--text-muted);
    font-size: var(--font-smallest);
  }
  .vc-debug-copy:hover {
    background: var(--background-modifier-hover);
    color: var(--text-normal);
  }
  .vc-debug-clear {
    padding: var(--size-4-1) var(--size-4-2);
    background: none;
    border: 1px solid var(--text-error);
    border-radius: var(--radius-s);
    cursor: pointer;
    color: var(--text-error);
    font-size: var(--font-smallest);
  }
  .vc-debug-clear:hover {
    background: var(--text-error);
    color: var(--background-primary);
  }
  .vc-debug-section {
    padding: var(--size-4-2);
  }
  .vc-debug-section h4 {
    margin: var(--size-4-2) 0 var(--size-4-1);
    color: var(--text-muted);
    font-size: var(--font-smallest);
    text-transform: uppercase;
  }
  .vc-debug-table {
    width: 100%;
    border-collapse: collapse;
  }
  .vc-debug-table td {
    padding: 2px var(--size-4-1);
    vertical-align: top;
  }
  .vc-debug-table td:first-child {
    color: var(--text-muted);
    white-space: nowrap;
  }
  .vc-debug-mono {
    font-family: var(--font-monospace);
    font-size: var(--font-smallest);
    word-break: break-all;
  }
  .vc-debug-empty {
    color: var(--text-faint);
    font-style: italic;
    margin: 0;
  }
  .vc-debug-clear-sm {
    margin-left: var(--size-4-1);
    padding: 0 4px;
    background: none;
    border: 1px solid var(--text-error);
    border-radius: 2px;
    cursor: pointer;
    color: var(--text-error);
    font-size: var(--font-smallest);
    font-weight: normal;
    text-transform: none;
  }
  .vc-debug-clear-sm:hover {
    background: var(--text-error);
    color: var(--background-primary);
  }
  .vc-debug-errors {
    max-height: 200px;
    overflow-y: auto;
  }
  .vc-debug-error-item {
    margin: 2px 0;
    padding: var(--size-4-1);
    background: var(--background-modifier-error);
    color: var(--text-error);
    border-radius: var(--radius-s);
    white-space: pre-wrap;
    word-break: break-all;
    font-size: var(--font-smallest);
  }
  .vc-debug-list {
    max-height: 320px;
    overflow-y: auto;
  }
  .vc-debug-list-item {
    padding: var(--size-4-1) 0;
    border-bottom: 1px solid var(--background-modifier-border-hover);
  }
  .vc-debug-time {
    color: var(--text-faint);
    margin-right: var(--size-4-1);
  }
  .vc-debug-event-name {
    color: var(--text-accent);
    font-weight: 600;
  }
  .vc-debug-log-level {
    margin: 0 var(--size-4-1);
    font-weight: 600;
  }
  .vc-debug-log-source {
    color: var(--text-muted);
    margin-right: var(--size-4-1);
  }
  .vc-debug-log-msg {
    color: var(--text-normal);
  }
  .vc-debug-payload {
    margin: 2px 0 0;
    padding: var(--size-4-1);
    background: var(--background-primary-alt);
    border-radius: var(--radius-s);
    font-size: var(--font-smallest);
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 120px;
    overflow-y: auto;
    color: var(--text-muted);
  }
  .vc-debug-raw {
    max-height: 320px;
    overflow: auto;
    padding: var(--size-4-2);
    background: var(--background-primary-alt);
    border-radius: var(--radius-s);
    font-size: var(--font-smallest);
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
