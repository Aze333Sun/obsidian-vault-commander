<script lang="ts">
  export let healthData: Array<{
    vaultId: string;
    vaultName: string;
    overall: number;
    dimensions: {
      activity: number;
      linkIntegrity: number;
      structure: number;
      updateFrequency: number;
    };
  }> = [];

  function scoreColor(score: number): string {
    if (score >= 80) return 'var(--color-green)';
    if (score >= 60) return 'var(--color-orange)';
    return 'var(--color-red)';
  }
</script>

<div class="vc-health">
  <h3 class="vc-section-title">库健康度</h3>
  {#if healthData.length === 0}
    <p class="vc-muted">暂无健康度数据</p>
  {:else}
    {#each healthData as vault}
      <div class="vc-health-item">
        <div class="vc-health-header">
          <span class="vc-health-name">{vault.vaultName}</span>
          <span class="vc-health-score" style="color: {scoreColor(vault.overall)}">
            {vault.overall}
          </span>
        </div>
        <div class="vc-health-bars">
          <div class="vc-health-bar-row">
            <span class="vc-health-bar-label">活跃度</span>
            <div class="vc-health-bar-track">
              <div class="vc-health-bar-fill" style="width: {vault.dimensions.activity}%"></div>
            </div>
          </div>
          <div class="vc-health-bar-row">
            <span class="vc-health-bar-label">链接</span>
            <div class="vc-health-bar-track">
              <div class="vc-health-bar-fill" style="width: {vault.dimensions.linkIntegrity}%"></div>
            </div>
          </div>
          <div class="vc-health-bar-row">
            <span class="vc-health-bar-label">结构</span>
            <div class="vc-health-bar-track">
              <div class="vc-health-bar-fill" style="width: {vault.dimensions.structure}%"></div>
            </div>
          </div>
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .vc-health {
    margin-bottom: var(--size-4-3);
  }
  .vc-health-item {
    padding: var(--size-4-2);
    background: var(--background-secondary);
    border-radius: var(--radius-m);
    margin-bottom: var(--size-4-1);
  }
  .vc-health-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--size-4-1);
  }
  .vc-health-name {
    font-size: var(--font-ui-small);
    font-weight: 500;
    color: var(--text-normal);
  }
  .vc-health-score {
    font-size: var(--font-ui-large);
    font-weight: 700;
  }
  .vc-health-bars {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .vc-health-bar-row {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
  }
  .vc-health-bar-label {
    width: 40px;
    font-size: var(--font-smallest);
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .vc-health-bar-track {
    flex: 1;
    height: 6px;
    background: var(--background-modifier-border);
    border-radius: 3px;
    overflow: hidden;
  }
  .vc-health-bar-fill {
    height: 100%;
    background: var(--interactive-accent);
    border-radius: 3px;
    transition: width 0.5s ease;
  }
</style>
