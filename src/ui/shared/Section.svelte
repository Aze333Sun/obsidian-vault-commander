<script lang="ts">
  export let title: string = '';
  export let badge: string = '';
  export let defaultOpen: boolean = true;

  let open = defaultOpen;
</script>

<div class="vc-section">
  <button class="vc-section-header" on:click={() => (open = !open)} type="button">
    <span class="vc-section-title">{title}</span>
    {#if badge}
      <span class="vc-section-badge">{badge}</span>
    {/if}
    <svg class="vc-section-chevron" class:open viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  {#if open}
    <div class="vc-section-body">
      <slot />
    </div>
  {/if}
</div>

<style>
  .vc-section {
    margin-bottom: 10px;
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    overflow: hidden;
  }
  .vc-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 14px;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    font-size: 13px;
    color: var(--text-normal);
    user-select: none;
  }
  .vc-section-header:hover {
    background: var(--background-secondary);
  }
  .vc-section-title {
    font-weight: 600;
    font-size: 12px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .vc-section-badge {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    background: var(--background-secondary);
    padding: 1px 8px;
    border-radius: 10px;
    min-width: 20px;
    text-align: center;
  }
  .vc-section-chevron {
    margin-left: auto;
    width: 16px;
    height: 16px;
    color: var(--text-faint);
    transition: transform 0.2s ease;
  }
  .vc-section-chevron.open {
    transform: rotate(180deg);
  }
  .vc-section-body {
    padding: 8px 14px 14px;
  }
</style>
