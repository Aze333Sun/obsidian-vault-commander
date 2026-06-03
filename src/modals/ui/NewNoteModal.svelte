<script lang="ts">
  export let visible: boolean = false;
  export let onClose: () => void = () => {};
  export let vaults: Array<{ id: string; name: string }> = [];
  export let getFolders: (vaultId: string) => Promise<string[]> = async () => ['/'];
  export let getTemplates: (vaultId: string) => Promise<Array<{ name: string; path: string }>> = async () => [];
  export let onCreate: (params: {
    title: string; vaultId: string; folder: string; templateId?: string;
    openAfterCreate: boolean; onConflict: 'cancel' | 'rename' | 'overwrite';
  }) => Promise<{ success: boolean; filePath: string; error?: string }> = async () => ({ success: false, filePath: '' });

  let title: string = '';
  let selectedVaultId: string = '';
  let selectedFolder: string = '/';
  let selectedTemplate: string = '';
  let openAfterCreate: boolean = true;
  let onConflict: 'cancel' | 'rename' | 'overwrite' = 'cancel';
  let folders: string[] = ['/'];
  let templates: Array<{ name: string; path: string }> = [];
  let creating: boolean = false;
  let error: string | null = null;
  let successMessage: string | null = null;
  let titleInput: HTMLInputElement;

  let initialized = false;
  $: if (visible && vaults.length > 0 && !initialized) {
    initialized = true;
    if (!selectedVaultId) selectedVaultId = vaults[0].id;
    title = ''; error = null; successMessage = null; creating = false;
    setTimeout(() => titleInput?.focus(), 50);
  }
  $: if (selectedVaultId && visible) {
    loadVaultData(selectedVaultId);
  }

  async function loadVaultData(vaultId: string) {
    folders = await getFolders(vaultId);
    templates = await getTemplates(vaultId);
    if (!folders.includes(selectedFolder)) selectedFolder = '/';
  }

  async function handleCreate() {
    if (!title.trim()) { error = '请输入笔记标题'; return; }
    if (!selectedVaultId) { error = '请选择目标库'; return; }
    creating = true; error = null;
    try {
      const r = await onCreate({
        title: title.trim(), vaultId: selectedVaultId, folder: selectedFolder,
        templateId: selectedTemplate || undefined, openAfterCreate, onConflict,
      });
      if (r.success) {
        successMessage = `已创建于 ${r.filePath}`;
        title = '';
        setTimeout(() => onClose(), 800);
      } else { error = r.error || '创建失败'; }
    } catch (e) { error = e instanceof Error ? e.message : '创建失败'; }
    finally { creating = false; }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'Enter' && !creating) { e.preventDefault(); handleCreate(); }
  }
</script>

{#if visible}
  <div class="vc-overlay" on:click={onClose}>
    <div class="vc-modal" on:click|stopPropagation on:keydown={handleKeydown} role="dialog" aria-modal="true">
      <div class="vc-header">
        <h2 class="vc-title">新建笔记</h2>
        <button class="vc-close" on:click={onClose}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="vc-body">
        {#if successMessage}<div class="vc-success">{successMessage}</div>{/if}
        {#if error}<div class="vc-error">{error}</div>{/if}

        <div class="vc-field">
          <label class="vc-label" for="nn-title">笔记标题</label>
          <input id="nn-title" bind:this={titleInput} class="vc-input" type="text" placeholder="输入笔记标题" bind:value={title} disabled={creating} />
        </div>
        <div class="vc-field">
          <label class="vc-label" for="nn-vault">目标库</label>
          <select id="nn-vault" class="vc-select" bind:value={selectedVaultId} disabled={creating}>
            {#each vaults as v}<option value={v.id}>{v.name}</option>{/each}
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="nn-folder">目标文件夹</label>
          <select id="nn-folder" class="vc-select" bind:value={selectedFolder} disabled={creating}>
            {#each folders as f}<option value={f}>{f}</option>{/each}
          </select>
        </div>
        <div class="vc-field">
          <label class="vc-label" for="nn-tpl">模板（可选）</label>
          <select id="nn-tpl" class="vc-select" bind:value={selectedTemplate} disabled={creating}>
            <option value="">不使用模板</option>
            {#each templates as tpl}<option value={tpl.path}>{tpl.name}</option>{/each}
          </select>
        </div>
        <label class="vc-check">
          <input type="checkbox" bind:checked={openAfterCreate} disabled={creating} />
          创建后立即打开
        </label>
      </div>

      <div class="vc-footer">
        <button class="vc-btn-cancel" on:click={onClose} disabled={creating}>取消</button>
        <button class="vc-btn-main" on:click={handleCreate} disabled={creating || !title.trim()}>
          {creating ? '创建中...' : '创建笔记'}
        </button>
      </div>
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
    width: 440px; max-height: 72vh;
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
  .vc-check {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: var(--text-muted); cursor: pointer;
  }
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
    padding: 12px 14px; border-radius: 8px;
    background: var(--background-modifier-success); color: var(--text-success);
    font-size: 13px;
  }
  .vc-error {
    padding: 10px 14px; border-radius: 8px;
    background: var(--background-modifier-error); color: var(--text-error);
    font-size: 12px;
  }
</style>
