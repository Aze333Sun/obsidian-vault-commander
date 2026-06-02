<script lang="ts">
  export let visible: boolean = false;
  export let onClose: () => void = () => {};
  export let onOpenInVault: (() => void) | null = null;
  export let title: string = '';
  export let vaultName: string = '';
  export let filePath: string = '';
  export let content: string = '';
  export let loading: boolean = false;
  export let error: string | null = null;

  $: body = content.replace(/^---[\s\S]*?---\n*/, '').trim();
</script>

{#if visible}
  <div class="vc-overlay" on:click={onClose}>
    <div class="vc-modal" on:click|stopPropagation role="dialog" aria-modal="true">
      <div class="vc-header">
        <div class="vc-header-left">
          <h2 class="vc-title">{title || '笔记预览'}</h2>
          <span class="vc-source">{vaultName} · {filePath}</span>
        </div>
        <div class="vc-header-right">
          {#if onOpenInVault}
            <button class="vc-btn-main" on:click={onOpenInVault}>在库中打开</button>
          {/if}
          <button class="vc-close" on:click={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="vc-body">
        {#if loading}
          <div class="vc-status">加载中...</div>
        {:else if error}
          <div class="vc-status vc-err">{error}</div>
        {:else if body}
          <pre class="vc-content">{body}</pre>
        {:else}
          <div class="vc-status">空白笔记</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .vc-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 6vh; z-index: 1000;
  }
  .vc-modal {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 14px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.18);
    width: 720px;
    max-height: 85vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .vc-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--background-modifier-border);
    gap: 12px;
  }
  .vc-header-left { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .vc-title {
    margin: 0; font-size: 16px; font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .vc-source { font-size: 11px; color: var(--text-faint); }
  .vc-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .vc-close {
    background: none; border: none; color: var(--text-muted); cursor: pointer;
    padding: 4px; border-radius: 6px; display: flex;
  }
  .vc-close:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
  .vc-body { flex: 1; overflow-y: auto; padding: 20px; }
  .vc-status { text-align: center; color: var(--text-muted); padding: 56px 0; font-size: 13px; }
  .vc-err { color: var(--text-error); }
  .vc-content {
    margin: 0;
    font-family: var(--font-text, var(--font-interface));
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-normal);
    white-space: pre-wrap;
    word-break: break-word;
  }
  .vc-btn-main {
    padding: 6px 14px;
    background: var(--interactive-accent);
    color: #fff;
    border: none; border-radius: 6px;
    cursor: pointer; font-size: 12px; font-weight: 500;
  }
  .vc-btn-main:hover { filter: brightness(0.95); }
</style>
