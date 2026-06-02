<script lang="ts">
  export let onRefresh: (() => void) | null = null;
  export let onSearch: (() => void) | null = null;
  export let scanning: boolean = false;
  export let hostName: string = '';
  export let hostNotes: number = 0;
  export let onOpenVault: (() => void) | null = null;
</script>

<div class="vc-topbar">
  <div class="vc-topbar-left">
    <span class="vc-logo">◆</span>
    <span class="vc-title">Vault Commander</span>
    {#if hostName}
      <button class="vc-host-badge" on:click={onOpenVault} title="点击查看当前库内容">
        {hostName} · {hostNotes}
      </button>
    {/if}
  </div>
  <div class="vc-actions">
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
  .vc-actions { display: flex; align-items: center; gap: 2px; }
  .vc-icon-btn {
    display: flex; align-items: center; justify-content: center;
    width: 30px; height: 30px; padding: 0;
    background: none; border: none; border-radius: 6px;
    color: var(--text-muted); cursor: pointer;
  }
  .vc-icon-btn:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
</style>
