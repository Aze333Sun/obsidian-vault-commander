<script lang="ts">
  export let message: string = '';
</script>

<div class="vc-loading">
  <div class="vc-loading-spinner"></div>
  {#if message}
    <p class="vc-loading-text">{message}</p>
  {/if}
</div>

<style>
  .vc-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--size-4-8);
    gap: var(--size-4-2);
  }
  .vc-loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--background-modifier-border);
    border-top-color: var(--interactive-accent);
    border-radius: 50%;
    animation: vc-spin 0.8s linear infinite;
  }
  @keyframes vc-spin {
    to { transform: rotate(360deg); }
  }
  .vc-loading-text {
    color: var(--text-muted);
    font-size: var(--font-small);
    margin: 0;
  }
</style>
