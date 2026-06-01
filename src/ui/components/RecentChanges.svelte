<script lang="ts">
  export let changes: Array<{
    vaultId: string;
    fileName: string;
    title: string;
    mtime: number;
    folder: string;
    tags: string[];
    isNew: boolean;
  }> = [];
  export let onOpenNote: (vaultId: string, filePath: string) => void = () => {};
</script>

<div class="vc-recent">
  <h3 class="vc-section-title">最近更新</h3>
  {#if changes.length === 0}
    <p class="vc-muted">暂无更新</p>
  {:else}
    <div class="vc-recent-list">
      {#each changes as item}
        <div
          class="vc-recent-item"
          on:click={() => onOpenNote(item.vaultId, item.fileName)}
          role="button"
          tabindex="0"
        >
          <div class="vc-recent-main">
            <span class="vc-recent-title">{item.title}</span>
            <span class="vc-recent-folder">{item.folder}</span>
          </div>
          <div class="vc-recent-meta">
            {#if item.isNew}
              <span class="vc-badge-new">新建</span>
            {/if}
            {#each item.tags as tag}
              <span class="vc-tag">#{tag}</span>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .vc-recent {
    margin-bottom: var(--size-4-3);
  }
  .vc-recent-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .vc-recent-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--size-4-1) var(--size-4-2);
    border-radius: var(--radius-s);
    cursor: pointer;
    transition: background 0.1s ease;
  }
  .vc-recent-item:hover {
    background: var(--background-modifier-hover);
  }
  .vc-recent-main {
    display: flex;
    flex-direction: column;
  }
  .vc-recent-title {
    font-size: var(--font-ui-small);
    color: var(--text-normal);
    font-weight: 500;
  }
  .vc-recent-folder {
    font-size: var(--font-smallest);
    color: var(--text-faint);
  }
  .vc-recent-meta {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .vc-badge-new {
    padding: 1px 6px;
    border-radius: var(--radius-s);
    background: var(--color-green);
    color: var(--text-on-accent);
    font-size: var(--font-smallest);
  }
  .vc-tag {
    font-size: var(--font-smallest);
    color: var(--text-muted);
  }
</style>
