<script lang="ts">
  export let tags: Array<{ tag: string; count: number }> = [];
  export let onTagClick: ((tag: string) => void) | null = null;

  $: maxCount = tags.length > 0 ? Math.max(...tags.map(t => t.count)) : 1;
  $: sorted = [...tags].sort((a, b) => b.count - a.count).slice(0, 50);

  function fontSize(count: number): string {
    const min = 0.8;
    const max = 1.8;
    const ratio = count / maxCount;
    return `${min + ratio * (max - min)}em`;
  }
</script>

<div class="vc-tagcloud">
  <h3 class="vc-section-title">标签云</h3>
  {#if sorted.length === 0}
    <p class="vc-muted">暂无标签</p>
  {:else}
    <div class="vc-tagcloud-container">
      {#each sorted as { tag, count }}
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
        <span
          class="vc-tagcloud-tag"
          style="font-size: {fontSize(count)}"
          on:click={() => onTagClick?.(tag)}
          on:keydown={(e) => { if (e.key === 'Enter' && onTagClick) onTagClick(tag); }}
          role={onTagClick ? 'button' : undefined}
          tabindex={onTagClick ? 0 : -1}
          title="{tag} ({count})"
        >
          #{tag}
        </span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .vc-tagcloud {
    margin-bottom: var(--size-4-3);
  }
  .vc-tagcloud-container {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-4-1);
    align-items: center;
  }
  .vc-tagcloud-tag {
    color: var(--tag-color);
    cursor: default;
    transition: opacity 0.15s ease;
  }
  .vc-tagcloud-tag:hover {
    opacity: 0.7;
  }
</style>
