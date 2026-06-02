<script lang="ts">
  import Paginator from '../shared/Paginator.svelte';

  const PAGE_SIZE = 8;

  export let changes: Array<{
    vaultId: string; fileName: string; title: string; mtime: number;
    folder: string; tags: string[]; isNew: boolean;
  }> = [];
  export let onOpenNote: (vaultId: string, filePath: string) => void = () => {};

  let page = 0;
  $: total = changes.length;
  $: visible = changes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  // Reset page when data changes
  $: if (changes) { if (page * PAGE_SIZE >= changes.length) page = 0; }
</script>

{#if visible.length > 0}
  <div class="vc-recent-list">
    {#each visible as item}
      <button class="vc-recent-item" on:click={() => onOpenNote(item.vaultId, item.fileName)}>
        <div class="vc-recent-main">
          <span class="vc-recent-title">{item.title}</span>
          <span class="vc-recent-folder">{item.folder}</span>
        </div>
        <div class="vc-recent-meta">
          {#if item.isNew}<span class="vc-badge-new">新建</span>{/if}
          {#each item.tags.slice(0, 3) as tag}<span class="vc-tag">#{tag}</span>{/each}
        </div>
      </button>
    {/each}
  </div>
  <Paginator {total} pageSize={PAGE_SIZE} current={page} onPage={(n) => (page = n)} />
{/if}

<style>
  .vc-recent-list { display: flex; flex-direction: column; gap: 1px; }
  .vc-recent-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 3px var(--size-4-1); border-radius: var(--radius-s);
    cursor: pointer; transition: background 0.1s ease;
    background: none; border: none; width: 100%; text-align: left;
  }
  .vc-recent-item:hover { background: var(--background-modifier-hover); }
  .vc-recent-main { display: flex; flex-direction: column; min-width: 0; }
  .vc-recent-title {
    font-size: var(--font-ui-smaller); color: var(--text-normal);
    font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .vc-recent-folder { font-size: var(--font-smallest); color: var(--text-faint); }
  .vc-recent-meta { display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: var(--size-4-1); }
  .vc-badge-new {
    padding: 0 5px; border-radius: var(--radius-s);
    background: var(--color-green); color: var(--text-on-accent); font-size: var(--font-smallest);
  }
  .vc-tag { font-size: var(--font-smallest); color: var(--text-muted); }
</style>
