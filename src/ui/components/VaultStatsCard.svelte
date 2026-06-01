<script lang="ts">
  export let vaultName: string = '';
  export let totalNotes: number = 0;
  export let totalFolders: number = 0;
  export let tagCount: number = 0;
  export let added7d: number = 0;
</script>

<div class="vc-card vc-stats-card">
  <h3 class="vc-card-title">{vaultName}</h3>
  <div class="vc-stats-grid">
    <div class="vc-stat">
      <span class="vc-stat-value">{totalNotes}</span>
      <span class="vc-stat-label">笔记总数</span>
    </div>
    <div class="vc-stat">
      <span class="vc-stat-value">{totalFolders}</span>
      <span class="vc-stat-label">文件夹</span>
    </div>
    <div class="vc-stat">
      <span class="vc-stat-value">{tagCount}</span>
      <span class="vc-stat-label">标签</span>
    </div>
    <div class="vc-stat">
      <span class="vc-stat-value">+{added7d}</span>
      <span class="vc-stat-label">本周新增</span>
    </div>
  </div>
</div>

<style>
  .vc-stats-card {
    margin-bottom: var(--size-4-2);
  }
  .vc-card-title {
    font-size: var(--font-ui-medium);
    font-weight: 600;
    margin: 0 0 var(--size-4-1);
    color: var(--text-normal);
  }
  .vc-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--size-4-2);
  }
  .vc-stat {
    display: flex;
    flex-direction: column;
  }
  .vc-stat-value {
    font-size: var(--font-ui-large);
    font-weight: 700;
    color: var(--text-normal);
  }
  .vc-stat-label {
    font-size: var(--font-smallest);
    color: var(--text-muted);
  }
</style>
