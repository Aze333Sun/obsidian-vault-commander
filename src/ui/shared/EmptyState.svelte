<script lang="ts">
  export let title: string = '';
  export let description: string = '';
  export let actionLabel: string = '';
  export let onAction: (() => void) | null = null;
</script>

<div class="vc-empty">
  <div class="vc-empty-icon">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  </div>
  {#if title}
    <h3 class="vc-empty-title">{title}</h3>
  {/if}
  {#if description}
    <p class="vc-empty-desc">{description}</p>
  {/if}
  {#if actionLabel && onAction}
    <button class="vc-button" on:click={onAction}>{actionLabel}</button>
  {/if}
</div>

<style>
  .vc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--size-4-6);
    text-align: center;
    gap: var(--size-4-2);
  }
  .vc-empty-icon {
    color: var(--text-muted);
    margin-bottom: var(--size-4-1);
  }
  .vc-empty-title {
    margin: 0;
    color: var(--text-normal);
    font-size: var(--font-ui-medium);
  }
  .vc-empty-desc {
    margin: 0;
    color: var(--text-muted);
    font-size: var(--font-small);
  }
</style>
