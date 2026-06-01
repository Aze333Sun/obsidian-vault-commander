<script lang="ts">
  export let name: string = '';
  export let status: 'ok' | 'warning' | 'error' = 'ok';
  export let onClick: (() => void) | null = null;
</script>

<span
  class="vc-badge vc-badge-{status}"
  on:click={() => onClick?.()}
  role={onClick ? 'button' : undefined}
  tabindex={onClick ? 0 : undefined}
>
  {name}
</span>

<style>
  .vc-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--radius-s);
    font-size: var(--font-small);
    font-weight: 500;
  }
  .vc-badge-ok {
    background: var(--color-green);
    color: var(--text-on-accent);
  }
  .vc-badge-warning {
    background: var(--color-orange);
    color: var(--text-on-accent);
  }
  .vc-badge-error {
    background: var(--color-red);
    color: var(--text-on-accent);
  }
</style>
