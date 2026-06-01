<script lang="ts">
  export let embedData: Array<{
    vaultId: string;
    images: number;
    audio: number;
    video: number;
    other: number;
    broken: number;
  }> = [];
</script>

<div class="vc-embed">
  <h3 class="vc-section-title">嵌入引用</h3>
  {#if embedData.length === 0}
    <p class="vc-muted">暂无嵌入引用数据</p>
  {:else}
    {#each embedData as vault}
      <div class="vc-embed-item">
        <span class="vc-embed-name">{vault.vaultId}</span>
        <div class="vc-embed-counts">
          <span>图片: {vault.images}</span>
          <span>音频: {vault.audio}</span>
          <span>视频: {vault.video}</span>
          <span>其他: {vault.other}</span>
          {#if vault.broken > 0}
            <span class="vc-embed-broken">断链: {vault.broken}</span>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>

<style>
  .vc-embed {
    margin-bottom: var(--size-4-3);
  }
  .vc-embed-item {
    padding: var(--size-4-1) 0;
  }
  .vc-embed-name {
    font-size: var(--font-ui-small);
    font-weight: 500;
    color: var(--text-normal);
  }
  .vc-embed-counts {
    display: flex;
    gap: var(--size-4-2);
    font-size: var(--font-smallest);
    color: var(--text-muted);
    margin-top: 2px;
  }
  .vc-embed-broken {
    color: var(--text-error);
  }
</style>
