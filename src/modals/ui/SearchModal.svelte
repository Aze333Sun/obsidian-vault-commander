<script lang="ts">
  export let visible: boolean = false;
  export let onClose: () => void = () => {};
</script>

{#if visible}
  <div class="vc-modal-overlay" on:click={onClose}>
    <div class="vc-modal" on:click|stopPropagation>
      <slot />
    </div>
  </div>
{/if}

<style>
  .vc-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  .vc-modal {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-l);
    box-shadow: var(--shadow-l);
    min-width: 400px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
  }
</style>
