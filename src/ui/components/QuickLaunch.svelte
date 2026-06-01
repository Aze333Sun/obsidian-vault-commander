<script lang="ts">
  export let vaults: Array<{
    id: string;
    name: string;
    path: string;
    totalNotes: number;
  }> = [];
  export let onOpenVault: (vaultId: string) => void = () => {};
</script>

<div class="vc-quicklaunch">
  <h3 class="vc-section-title">快速启动</h3>
  {#if vaults.length === 0}
    <p class="vc-muted">暂无分库</p>
  {:else}
    <div class="vc-quicklaunch-grid">
      {#each vaults as vault}
        <button
          class="vc-quicklaunch-item"
          on:click={() => onOpenVault(vault.id)}
          title={vault.path}
        >
          <span class="vc-quicklaunch-name">{vault.name}</span>
          <span class="vc-quicklaunch-count">{vault.totalNotes} 笔记</span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .vc-quicklaunch {
    margin-bottom: var(--size-4-3);
  }
  .vc-section-title {
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 var(--size-4-1);
  }
  .vc-quicklaunch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: var(--size-4-1);
  }
  .vc-quicklaunch-item {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: var(--size-4-2);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
    background: var(--background-secondary);
    cursor: pointer;
    text-align: left;
    transition: border-color 0.15s ease;
  }
  .vc-quicklaunch-item:hover {
    border-color: var(--interactive-accent);
  }
  .vc-quicklaunch-name {
    font-size: var(--font-ui-small);
    font-weight: 500;
    color: var(--text-normal);
  }
  .vc-quicklaunch-count {
    font-size: var(--font-smallest);
    color: var(--text-muted);
  }
  .vc-muted {
    color: var(--text-muted);
    font-size: var(--font-small);
    margin: 0;
  }
</style>
