<script lang="ts">
  export let message: string = '';
  export let onRetry: (() => void) | null = null;
</script>

{#if message}
  <div class="vc-error">
    <span class="vc-error-icon">⚠</span>
    <span class="vc-error-text">{message}</span>
    {#if onRetry}
      <button class="vc-error-retry" on:click={onRetry}>重试</button>
    {/if}
  </div>
{/if}

<style>
  .vc-error {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    padding: var(--size-4-2) var(--size-4-3);
    background: var(--background-modifier-error);
    color: var(--text-error);
    border-radius: var(--radius-s);
    margin-bottom: var(--size-4-2);
    font-size: var(--font-small);
  }
  .vc-error-icon {
    flex-shrink: 0;
  }
  .vc-error-text {
    flex: 1;
  }
  .vc-error-retry {
    background: none;
    border: 1px solid var(--text-error);
    color: var(--text-error);
    border-radius: var(--radius-s);
    padding: 2px 8px;
    cursor: pointer;
    font-size: var(--font-small);
  }
  .vc-error-retry:hover {
    background: var(--text-error);
    color: var(--background-primary);
  }
</style>
