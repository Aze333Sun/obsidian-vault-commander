<script lang="ts">
  export let visible: boolean = false;
  export let onClose: () => void = () => {};
  export let sourceName: string = '';
  export let sourceContent: string = '';
  export let vaults: Array<{ id: string; name: string; path: string }> = [];
  export let getFolders: (vaultId: string) => Promise<string[]> = async () => ['/'];
  export let onDispatch: (params: {
    targetVaultId: string; targetFolder: string; fileName: string; content: string;
  }) => Promise<{ success: boolean; error?: string }> = async () => ({ success: false });

  let selectedVaultId: string = '';
  let selectedFolder: string = '/';
  let fileName: string = '';
  let folders: string[] = ['/'];
  let dispatching: boolean = false;
  let error: string | null = null;
  let done: boolean = false;

  let initialized = false;
  $: if (visible && vaults.length > 0 && !initialized) {
    initialized = true;
    selectedVaultId = vaults[0].id;
    selectedFolder = '/';
    fileName = sourceName;
    error = null; done = false; dispatching = false;
  }
  $: if (selectedVaultId && visible) {
    getFolders(selectedVaultId).then((f) => {
      folders = f;
      if (!f.includes(selectedFolder)) selectedFolder = '/';
    });
  }

  async function handleDispatch() {
    if (!fileName.trim()) { error = '请输入文件名'; return; }
    if (!selectedVaultId) { error = '请选择目标库'; return; }
    dispatching = true; error = null;
    try {
      const r = await onDispatch({
        targetVaultId: selectedVaultId,
        targetFolder: selectedFolder,
        fileName: fileName.endsWith('.md') ? fileName : fileName + '.md',
        content: sourceContent,
      });
      if (r.success) { done = true; setTimeout(() => onClose(), 600); }
      else error = r.error || '分发失败';
    } catch (e) { error = e instanceof Error ? e.message : '分发失败'; }
    finally { dispatching = false; }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'Enter' && !dispatching) { e.preventDefault(); handleDispatch(); }
  }
</script>

{#if visible}
  <div class="vc-overlay" on:click={onClose}>
    <div class="vc-modal" on:click|stopPropagation on:keydown={handleKeydown} role="dialog" aria-modal="true">
      <div class="vc-header">
        <h2 class="vc-title">分发笔记</h2>
        <button class="vc-close" on:click={onClose}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="vc-body">
        {#if done}
          <div class="vc-success">已分发到目标库</div>
        {:else}
          {#if error}<div class="vc-error">{error}</div>{/if}

          <div class="vc-field">
            <label class="vc-label">源文件</label>
            <span class="vc-source-name">{sourceName}</span>
          </div>
          <div class="vc-field">
            <label class="vc-label">文件名</label>
            <input class="vc-input" type="text" bind:value={fileName} disabled={dispatching} />
          </div>
          <div class="vc-field">
            <label class="vc-label">目标库</label>
            <select class="vc-select" bind:value={selectedVaultId} disabled={dispatching}>
              {#each vaults as v}<option value={v.id}>{v.name}</option>{/each}
            </select>
          </div>
          <div class="vc-field">
            <label class="vc-label">目标文件夹</label>
            <select class="vc-select" bind:value={selectedFolder} disabled={dispatching}>
              {#each folders as f}<option value={f}>{f}</option>{/each}
            </select>
          </div>
        {/if}
      </div>

      {#if !done}
        <div class="vc-footer">
          <button class="vc-btn-cancel" on:click={onClose} disabled={dispatching}>取消</button>
          <button class="vc-btn-main" on:click={handleDispatch} disabled={dispatching || !fileName.trim()}>
            {dispatching ? '分发中...' : '分发'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .vc-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 12vh; z-index: 1000;
  }
  .vc-modal {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 14px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.18);
    width: 420px; max-height: 68vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .vc-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px; border-bottom: 1px solid var(--background-modifier-border);
  }
  .vc-title { margin: 0; font-size: 15px; font-weight: 600; }
  .vc-close {
    background: none; border: none; color: var(--text-muted); cursor: pointer;
    padding: 4px; border-radius: 6px; display: flex;
  }
  .vc-close:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
  .vc-body {
    flex: 1; overflow-y: auto; padding: 20px;
    display: flex; flex-direction: column; gap: 14px;
  }
  .vc-field { display: flex; flex-direction: column; gap: 5px; }
  .vc-label { font-size: 12px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .vc-source-name { font-size: 13px; color: var(--text-faint); }
  .vc-input, .vc-select {
    padding: 8px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: 13px;
    font-family: var(--font-interface);
  }
  .vc-input:focus, .vc-select:focus { border-color: var(--interactive-accent); outline: none; }
  .vc-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 14px 20px; border-top: 1px solid var(--background-modifier-border);
  }
  .vc-btn-main {
    padding: 8px 20px;
    background: var(--interactive-accent);
    color: #fff; border: none; border-radius: 8px;
    cursor: pointer; font-size: 13px; font-weight: 500;
  }
  .vc-btn-main:disabled { opacity: 0.4; cursor: not-allowed; }
  .vc-btn-cancel {
    padding: 8px 16px;
    background: var(--background-secondary);
    color: var(--text-normal);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px; cursor: pointer; font-size: 13px;
  }
  .vc-btn-cancel:hover { background: var(--background-modifier-hover); }
  .vc-success {
    padding: 14px; border-radius: 8px;
    background: var(--background-modifier-success); color: var(--text-success);
    font-size: 13px;
  }
  .vc-error {
    padding: 10px 14px; border-radius: 8px;
    background: var(--background-modifier-error); color: var(--text-error);
    font-size: 12px;
  }
</style>
