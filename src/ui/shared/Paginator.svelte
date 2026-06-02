<script lang="ts">
  export let total: number = 0;
  export let pageSize: number = 8;
  export let current: number = 0;

  export let onPage: ((n: number) => void) | null = null;

  $: totalPages = Math.max(1, Math.ceil(total / pageSize));
  $: pages = buildPages(current, totalPages);

  function buildPages(cur: number, max: number): Array<number | '...'> {
    if (max <= 7) return Array.from({ length: max }, (_, i) => i);
    const result: Array<number | '...'> = [0];
    if (cur > 2) result.push('...');
    for (let i = Math.max(1, cur - 1); i <= Math.min(max - 2, cur + 1); i++) {
      result.push(i);
    }
    if (cur < max - 3) result.push('...');
    result.push(max - 1);
    return result;
  }

  function go(n: number) {
    if (n >= 0 && n < totalPages && onPage) onPage(n);
  }

  let jumpVal = '';
  function jump() {
    const n = parseInt(jumpVal);
    if (n >= 1 && n <= totalPages) go(n - 1);
    jumpVal = '';
  }
</script>

{#if totalPages > 1}
  <div class="vc-pager">
    <button class="vc-pager-btn" disabled={current === 0} on:click={() => go(current - 1)}>‹</button>
    {#each pages as p}
      {#if p === '...'}
        <span class="vc-pager-dots">…</span>
      {:else}
        <button class="vc-pager-btn" class:active={p === current} on:click={() => go(p)}>{p + 1}</button>
      {/if}
    {/each}
    <button class="vc-pager-btn" disabled={current >= totalPages - 1} on:click={() => go(current + 1)}>›</button>
    {#if totalPages > 10}
      <input
        class="vc-pager-jump"
        type="text"
        placeholder="#"
        size="3"
        bind:value={jumpVal}
        on:keydown={(e) => { if (e.key === 'Enter') jump(); }}
      />
    {/if}
    <span class="vc-pager-info">{current + 1}/{totalPages} 页</span>
  </div>
{/if}

<style>
  .vc-pager {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 8px 0 2px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .vc-pager-btn {
    min-width: 24px;
    height: 24px;
    padding: 0 5px;
    background: none;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .vc-pager-btn:hover { border-color: var(--text-muted); color: var(--text-normal); }
  .vc-pager-btn.active { background: var(--interactive-accent); border-color: var(--interactive-accent); color: #fff; }
  .vc-pager-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .vc-pager-dots { font-size: 11px; color: var(--text-faint); padding: 0 2px; }
  .vc-pager-jump {
    width: 30px; height: 24px; padding: 0 4px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px; font-size: 11px; text-align: center;
    background: var(--background-primary); color: var(--text-normal);
    margin: 0 2px;
  }
  .vc-pager-jump:focus { border-color: var(--interactive-accent); outline: none; }
  .vc-pager-info { font-size: 10px; color: var(--text-faint); margin-left: 4px; white-space: nowrap; }
</style>
