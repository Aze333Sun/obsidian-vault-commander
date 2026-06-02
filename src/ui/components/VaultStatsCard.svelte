<script lang="ts">
  export let vaultName: string = '';
  export let totalNotes: number = 0;
  export let totalFolders: number = 0;
  export let tagCount: number = 0;
  export let added7d: number = 0;
</script>

<div class="vc-stats-row">
  <span class="vc-stats-name">{vaultName}</span>
  <div class="vc-stats-items">
    <span class="vc-stat"><strong>{totalNotes}</strong><small>笔记</small></span>
    <span class="vc-stat"><strong>{totalFolders}</strong><small>文件夹</small></span>
    <span class="vc-stat"><strong>{tagCount}</strong><small>标签</small></span>
    <span class="vc-stat vc-stat-added">+{added7d}<small>本周</small></span>
  </div>
</div>

<style>
  .vc-stats-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 0;
    border-bottom: 1px solid var(--background-modifier-border-hover);
  }
  .vc-stats-row:last-child { border-bottom: none; }
  .vc-stats-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-normal);
    min-width: 100px;
    flex-shrink: 0;
  }
  .vc-stats-items {
    display: flex;
    gap: 20px;
  }
  .vc-stat {
    display: flex;
    align-items: baseline;
    gap: 3px;
    font-size: 13px;
    color: var(--text-muted);
  }
  .vc-stat strong {
    color: var(--text-normal);
    font-weight: 600;
  }
  .vc-stat small {
    font-size: 11px;
    color: var(--text-faint);
  }
  .vc-stat-added {
    color: var(--color-green);
  }
</style>
