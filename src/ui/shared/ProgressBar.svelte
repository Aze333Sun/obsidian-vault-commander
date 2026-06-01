<script lang="ts">
  export let percent: number = 0;
  export let label: string = '';
</script>

<div class="vc-progress">
  {#if label}
    <div class="vc-progress-label">{label}</div>
  {/if}
  <div class="vc-progress-track">
    <div class="vc-progress-fill" style="width: {Math.min(100, Math.max(0, percent))}%"></div>
  </div>
</div>

<style>
  .vc-progress {
    width: 100%;
  }
  .vc-progress-label {
    font-size: var(--font-small);
    color: var(--text-muted);
    margin-bottom: 4px;
  }
  .vc-progress-track {
    width: 100%;
    height: 6px;
    background: var(--background-modifier-border);
    border-radius: 3px;
    overflow: hidden;
  }
  .vc-progress-fill {
    height: 100%;
    background: var(--interactive-accent);
    border-radius: 3px;
    transition: width 0.3s ease;
  }
</style>
