<script lang="ts">
  export let suggestions: Array<{
    type: 'warning' | 'info' | 'tip';
    message: string;
    vaultId?: string;
    action?: {
      label: string;
      command: string;
      params?: Record<string, string>;
    };
  }> = [];

  $: visible = suggestions.filter((s) => s.type !== 'info' || suggestions.length <= 3);
</script>

{#if suggestions.length > 0}
  <div class="vc-suggestions">
    <h3 class="vc-section-title">改进建议</h3>
    <div class="vc-suggestion-list">
      {#each suggestions as s}
        <div class="vc-suggestion-item vc-suggestion-{s.type}">
          <span class="vc-suggestion-icon">
            {#if s.type === 'warning'}⚠{/if}
            {#if s.type === 'tip'}💡{/if}
            {#if s.type === 'info'}ℹ{/if}
          </span>
          <span class="vc-suggestion-text">{s.message}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .vc-suggestions {
    margin-bottom: var(--size-4-3);
  }
  .vc-suggestion-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .vc-suggestion-item {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    padding: var(--size-4-1) var(--size-4-2);
    border-radius: var(--radius-s);
    font-size: var(--font-small);
  }
  .vc-suggestion-icon {
    flex-shrink: 0;
    font-size: var(--font-ui-small);
  }
  .vc-suggestion-text {
    color: var(--text-normal);
    line-height: 1.4;
  }
  .vc-suggestion-warning {
    background: rgba(var(--color-orange-rgb), 0.1);
    border-left: 3px solid var(--color-orange);
  }
  .vc-suggestion-tip {
    background: rgba(var(--color-blue-rgb), 0.08);
    border-left: 3px solid var(--color-blue);
  }
  .vc-suggestion-info {
    background: rgba(var(--color-cyan-rgb), 0.08);
    border-left: 3px solid var(--color-cyan);
  }
</style>
