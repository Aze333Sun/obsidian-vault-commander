<script lang="ts">
  import Paginator from '../shared/Paginator.svelte';

  const PAGE_SIZE = 8;

  export let notes: Array<{
    vaultId: string; vaultName: string; fileName: string; title: string; folder: string;
  }> = [];
  export let onOpenNote: (vaultId: string, filePath: string) => void = () => {};
  export let onDeleteNote: (vaultId: string, filePath: string) => void = () => {};

  let confirmId: string | null = null;
  let page = 0;
  $: total = notes.length;
  $: visible = notes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  $: if (page * PAGE_SIZE >= notes.length) page = 0;
</script>

{#if notes.length > 0}
  <div class="vc-orphans">
    {#each visible as note (note.vaultId + '::' + note.fileName)}
      <div class="vc-orphan-item">
        <button class="vc-orphan-body" on:click={() => onOpenNote(note.vaultId, note.fileName)}>
          <span class="vc-orphan-title">{note.title || note.fileName}</span>
          <span class="vc-orphan-meta">{note.vaultName} · {note.folder}</span>
        </button>
        {#if confirmId === note.fileName}
          <div class="vc-orphan-confirm">
            <span>确定删除?</span>
            <button class="vc-del-yes" on:click={() => { onDeleteNote(note.vaultId, note.fileName); confirmId = null; }}>删除</button>
            <button class="vc-del-no" on:click={() => (confirmId = null)}>取消</button>
          </div>
        {:else}
          <button class="vc-orphan-del" on:click|stopPropagation={() => (confirmId = note.fileName)} title="删除">✕</button>
        {/if}
      </div>
    {/each}
  </div>
  <Paginator {total} pageSize={PAGE_SIZE} current={page} onPage={(n) => (page = n)} />
{/if}

<style>
  .vc-orphans { display: flex; flex-direction: column; }
  .vc-orphan-item { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid var(--background-modifier-border-hover); }
  .vc-orphan-item:last-child { border-bottom: none; }
  .vc-orphan-body {
    flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;
    background: none; border: none; cursor: pointer; text-align: left; padding: 2px 0;
  }
  .vc-orphan-body:hover .vc-orphan-title { color: var(--text-accent); }
  .vc-orphan-title { font-size: 12px; color: var(--text-normal); }
  .vc-orphan-meta { font-size: 10px; color: var(--text-faint); }
  .vc-orphan-del {
    flex-shrink: 0; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
    background: none; border: none; cursor: pointer; color: var(--text-faint); border-radius: 4px; font-size: 12px;
  }
  .vc-orphan-del:hover { background: var(--background-modifier-error); color: var(--text-error); }
  .vc-orphan-confirm {
    display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-error); flex-shrink: 0;
  }
  .vc-del-yes, .vc-del-no {
    padding: 1px 6px; border-radius: 3px; border: none; cursor: pointer; font-size: 10px;
  }
  .vc-del-yes { background: var(--text-error); color: #fff; }
  .vc-del-no { background: var(--background-modifier-border); color: var(--text-muted); }
</style>
