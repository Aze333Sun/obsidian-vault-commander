<script lang="ts">
  export let tags: Array<{ tag: string; count: number }> = [];
  export let onTagClick: ((tag: string) => void) | null = null;

  const ROWS = 3;

  $: maxCount = tags.length > 0 ? Math.max(...tags.map(t => t.count)) : 1;
  $: sorted = [...tags].sort((a, b) => b.count - a.count).slice(0, 20);
  $: cols = Math.ceil(sorted.length / ROWS);
  $: grid = Array.from({ length: ROWS }, (_, r) => sorted.slice(r * cols, (r + 1) * cols));

  function fontSize(count: number): string {
    const min = 0.8;
    const max = 1.5;
    return `${min + (count / maxCount) * (max - min)}em`;
  }
</script>

{#if sorted.length > 0}
  <div class="vc-tagcloud">
    {#each grid as row}
      <div class="vc-tagcloud-row">
        {#each row as { tag, count }}
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
    {/each}
  </div>
{/if}

<style>
  .vc-tagcloud {
    display: flex;
    flex-direction: column;
    gap: 3px;
    line-height: 1.4;
  }
  .vc-tagcloud-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 8px;
    align-items: baseline;
  }
  .vc-tagcloud-tag {
    color: var(--tag-color);
    cursor: default;
    transition: opacity 0.15s;
    white-space: nowrap;
  }
  .vc-tagcloud-tag:hover { opacity: 0.65; }
</style>
