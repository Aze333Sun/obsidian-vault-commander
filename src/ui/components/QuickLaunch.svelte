<script lang="ts">
  export let vaults: Array<{
    id: string; name: string; path: string; totalNotes: number; isHost: boolean;
  }> = [];
  export let onOpenVault: (vaultId: string) => void = () => {};
</script>

<div class="vc-launch">
  <div class="vc-launch-grid">
    {#each vaults as vault}
      <button
        class="vc-launch-card"
        class:is-host={vault.isHost}
        on:click={() => onOpenVault(vault.id)}
        title={vault.path}
      >
        <div class="vc-launch-icon">{vault.isHost ? '◆' : '◇'}</div>
        <div class="vc-launch-info">
          <span class="vc-launch-name">{vault.name}</span>
          <span class="vc-launch-meta">{vault.totalNotes} 篇笔记</span>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .vc-launch {
    margin-bottom: 14px;
  }
  .vc-launch-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 8px;
  }
  .vc-launch-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    background: var(--background-secondary);
    border: 1px solid transparent;
    border-radius: 10px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s, border-color 0.15s;
  }
  .vc-launch-card:hover {
    background: var(--background-primary);
    border-color: var(--interactive-accent);
  }
  .vc-launch-card.is-host {
    border-color: var(--interactive-accent);
    background: var(--background-primary);
  }
  .vc-launch-icon {
    font-size: 20px;
    color: var(--interactive-accent);
    flex-shrink: 0;
    line-height: 1;
  }
  .vc-launch-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .vc-launch-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-normal);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .vc-launch-meta {
    font-size: 11px;
    color: var(--text-faint);
  }
</style>
