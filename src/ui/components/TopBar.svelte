<script lang="ts">
  export let onRefresh: (() => void) | null = null;
  export let onSearch: (() => void) | null = null;
  export let onNewNote: (() => void) | null = null;
  export let onImport: (() => void) | null = null;
  export let scanning: boolean = false;
  export let hostName: string = '';
  export let hostNotes: number = 0;
  export let showHealth: boolean = false;
  export let healthScore: number = 0;
  export let healthActivity: number = 0;
  export let healthLinks: number = 0;
  export let healthLabel: string = '';
  export let onOpenVault: (() => void) | null = null;

  $: scoreColor = healthScore >= 80 ? 'var(--color-green)' : healthScore >= 60 ? 'var(--color-orange)' : 'var(--color-red)';
  $: barColor = healthScore >= 80 ? 'var(--color-green)' : healthScore >= 60 ? 'var(--color-orange)' : 'var(--color-red)';
</script>

<div class="vc-topbar">
  <div class="vc-topbar-left">
    <span class="vc-logo">◆</span>
    <span class="vc-title">控制台</span>
    {#if hostName}
      <button class="vc-host-badge" on:click={onOpenVault} title="点击查看当前库内容">
        {hostName} · {hostNotes}
      </button>
    {/if}
    {#if showHealth}
      <div class="vc-health-mini" title="{healthLabel}">
        <span class="vc-health-score" style="color:{scoreColor}">{healthScore}</span>
        <div class="vc-health-bars">
          <div class="vc-health-bar">
            <span class="vc-health-bar-lbl">活跃</span>
            <div class="vc-health-bar-t"><div class="vc-health-bar-f" style="width:{healthActivity}%; background:{barColor}"></div></div>
          </div>
          <div class="vc-health-bar">
            <span class="vc-health-bar-lbl">链接</span>
            <div class="vc-health-bar-t"><div class="vc-health-bar-f" style="width:{healthLinks}%; background:{barColor}"></div></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
  <div class="vc-actions">
    {#if onNewNote}
      <button class="vc-icon-btn" on:click={onNewNote} title="新建笔记并分发">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    {/if}
    {#if onImport}
      <button class="vc-icon-btn" on:click={onImport} title="从外库导入笔记">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
    {/if}
    {#if onSearch}
      <button class="vc-icon-btn" on:click={onSearch} title="跨库搜索 (Ctrl+Shift+F)">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>
    {/if}
    {#if onRefresh}
      <button class="vc-icon-btn" on:click={onRefresh} disabled={scanning} title="刷新扫描">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .vc-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 14px;
    background: var(--background-secondary);
    border-bottom: 1px solid var(--background-modifier-border);
    flex-shrink: 0;
  }
  .vc-topbar-left {
    display: flex; align-items: center; gap: 10px;
  }
  .vc-logo { font-size: 14px; color: var(--interactive-accent); }
  .vc-title { font-size: 14px; font-weight: 600; color: var(--text-normal); }
  .vc-host-badge {
    font-size: 11px; font-weight: 500; color: var(--text-muted);
    background: var(--background-primary);
    padding: 3px 10px; border-radius: 10px;
    border: 1px solid var(--background-modifier-border);
    cursor: pointer; white-space: nowrap;
    font-family: var(--font-interface);
  }
  .vc-host-badge:hover { border-color: var(--interactive-accent); color: var(--text-normal); }
  .vc-health-mini {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 2px;
  }
  .vc-health-score {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;
  }
  .vc-health-bars {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .vc-health-bar {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .vc-health-bar-lbl {
    font-size: 9px;
    color: var(--text-faint);
    width: 20px;
    flex-shrink: 0;
  }
  .vc-health-bar-t {
    width: 40px;
    height: 5px;
    background: var(--background-modifier-border);
    border-radius: 3px;
    overflow: hidden;
  }
  .vc-health-bar-f {
    height: 100%;
    border-radius: 3px;
    transition: width 0.5s ease;
  }
  .vc-actions { display: flex; align-items: center; gap: 2px; }
  .vc-icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    background: none; border: none; border-radius: 6px;
    color: var(--text-muted); cursor: pointer;
  }
  .vc-icon-btn:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
</style>
