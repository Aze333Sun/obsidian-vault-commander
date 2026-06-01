<script lang="ts">
  export let title: string = 'Vault Commander';
  export let onRefresh: (() => void) | null = null;
  export let onSearch: ((query: string) => void) | null = null;
  export let scanning: boolean = false;

  let searchQuery: string = '';
</script>

<div class="vc-topbar">
  <div class="vc-topbar-title">{title}</div>
  <div class="vc-topbar-actions">
    {#if onSearch}
      <input
        class="vc-topbar-search"
        type="text"
        placeholder="搜索笔记..."
        bind:value={searchQuery}
        on:keydown={(e) => {
          if (e.key === 'Enter' && searchQuery.trim()) {
            onSearch(searchQuery.trim());
          }
        }}
      />
    {/if}
    {#if onRefresh}
      <button
        class="vc-button vc-topbar-btn"
        on:click={onRefresh}
        disabled={scanning}
        title="刷新"
      >
        {scanning ? '扫描中...' : '刷新'}
      </button>
    {/if}
  </div>
</div>

<style>
  .vc-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--size-4-2) var(--size-4-3);
    border-bottom: 1px solid var(--background-modifier-border);
    background: var(--background-secondary);
  }
  .vc-topbar-title {
    font-size: var(--font-ui-medium);
    font-weight: 600;
    color: var(--text-normal);
  }
  .vc-topbar-actions {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
  }
  .vc-topbar-search {
    padding: 4px 8px;
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: var(--font-small);
    width: 200px;
  }
  .vc-topbar-search:focus {
    border-color: var(--interactive-accent);
    outline: none;
  }
  .vc-topbar-btn {
    font-size: var(--font-small);
  }
</style>
