<script lang="ts">
  export let visible: boolean = false;
  export let onClose: () => void = () => {};

  export let vaults: Array<{ id: string; name: string; path: string }> = [];
  export let getFiles: (vaultId: string) => Promise<Array<{ path: string; title: string; size: number }>> = async () => [];
  export let getFolders: (vaultId: string) => Promise<string[]> = async () => ['/'];
  export let onImport: (params: {
    sourceVaultId: string;
    sourceFile: string;
    targetFolder: string;
    fileName: string;
  }) => Promise<{ success: boolean; error?: string }> = async () => ({ success: false });

  let step: 'select' | 'import' = 'select';
  let selectedVaultId: string = '';
  let selectedFile: string = '';
  let fileName: string = '';
  let targetFolder: string = '/';
  let fileList: Array<{ path: string; title: string; size: number }> = [];
  let folders: string[] = ['/'];
  let filterText: string = '';
  let importing: boolean = false;
  let error: string | null = null;
  let done: boolean = false;

  $: filteredFiles = filterText
    ? fileList.filter(f => f.title.toLowerCase().includes(filterText.toLowerCase()) || f.path.toLowerCase().includes(filterText.toLowerCase()))
    : fileList;

  // Init on open
  $: if (visible && vaults.length > 0 && !selectedVaultId) {
    selectedVaultId = vaults[0].id;
    switchVault(vaults[0].id);
  }

  async function switchVault(vaultId: string) {
    selectedVaultId = vaultId;
    fileList = [];
    filterText = '';
    step = 'select';
    selectedFile = '';
    error = null;
    fileList = await getFiles(vaultId);
    getFolders(vaultId).then(f => folders = f);
  }

  function handleVaultChange(e: Event) {
    const id = (e.target as HTMLSelectElement).value;
    switchVault(id);
  }

  function selectFile(path: string) {
    selectedFile = path;
    fileName = path.split(/[/\\]/).pop() || path;
    step = 'import';
  }

  function back() { step = 'select'; selectedFile = ''; error = null; }

  async function handleImport() {
    if (!selectedFile || !selectedVaultId) return;
    importing = true; error = null;
    try {
      const r = await onImport({
        sourceVaultId: selectedVaultId,
        sourceFile: selectedFile,
        targetFolder,
        fileName: fileName || selectedFile.split(/[/\\]/).pop() || 'note.md',
      });
      if (r.success) { done = true; setTimeout(() => onClose(), 600); }
      else error = r.error || '导入失败';
    } catch (e) { error = e instanceof Error ? e.message : '导入失败'; }
    finally { importing = false; }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') step === 'import' ? back() : onClose();
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <button class="vc-overlay" on:click={onClose} on:keydown={handleKeydown}>
    <div class="vc-modal" on:click|stopPropagation role="dialog" aria-modal="true">
      <div class="vc-header">
        <h2 class="vc-title">
          {#if step === 'select'}选择笔记{/if}
          {#if step === 'import'}导入设置{/if}
        </h2>
        <button class="vc-close" on:click={onClose}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="vc-body">
        {#if done}
          <div class="vc-success">导入成功</div>
        {:else if step === 'select'}
          {#if error}<div class="vc-error">{error}</div>{/if}

          <div class="vc-field">
            <select class="vc-select" value={selectedVaultId} on:change={handleVaultChange}>
              {#each vaults as v}<option value={v.id}>{v.name}</option>{/each}
            </select>
          </div>

          <div class="vc-field">
            <input class="vc-input" type="text" placeholder="筛选文件名..." bind:value={filterText} />
          </div>

          <div class="vc-file-list">
            {#if fileList.length === 0}
              <div class="vc-empty">暂无文件</div>
            {:else if filteredFiles.length === 0}
              <div class="vc-empty">无匹配文件</div>
            {:else}
              {#each filteredFiles.slice(0, 100) as f}
                <button class="vc-file-item" on:click={() => selectFile(f.path)}>
                  <span class="vc-file-title">{f.title || f.path}</span>
                  <span class="vc-file-path">{f.path}</span>
                </button>
              {/each}
            {/if}
          </div>

        {:else if step === 'import'}
          {#if error}<div class="vc-error">{error}</div>{/if}

          <div class="vc-field">
            <label class="vc-label">源文件</label>
            <span class="vc-source">{selectedFile}</span>
          </div>
          <div class="vc-field">
            <label class="vc-label">文件名</label>
            <input class="vc-input" type="text" bind:value={fileName} disabled={importing} />
          </div>
          <div class="vc-field">
            <label class="vc-label">目标文件夹</label>
            <select class="vc-select" bind:value={targetFolder} disabled={importing}>
              {#each folders as f}<option value={f}>{f}</option>{/each}
            </select>
          </div>
        {/if}
      </div>

      {#if !done}
        <div class="vc-footer">
          {#if step === 'import'}
            <button class="vc-btn-cancel" on:click={back} disabled={importing}>返回</button>
          {/if}
          <button class="vc-btn-cancel" on:click={onClose} disabled={importing}>取消</button>
          {#if step === 'import'}
            <button class="vc-btn-main" on:click={handleImport} disabled={importing || !fileName.trim()}>
              {importing ? '导入中...' : '导入'}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  </button>
{/if}

<style>
  .vc-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 10vh; z-index: 1000;
  }
  .vc-modal {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 14px;
    box-shadow: 0 16px 48px rgba(0,0,0,0.18);
    width: 480px; max-height: 68vh;
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
    flex: 1; overflow-y: auto; padding: 16px 20px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .vc-field { display: flex; flex-direction: column; gap: 4px; }
  .vc-label { font-size: 12px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .vc-source { font-size: 13px; color: var(--text-faint); word-break: break-all; }
  .vc-input, .vc-select {
    padding: 8px 12px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px; background: var(--background-primary);
    color: var(--text-normal); font-size: 13px; font-family: var(--font-interface);
  }
  .vc-input:focus, .vc-select:focus { border-color: var(--interactive-accent); outline: none; }
  .vc-file-list {
    display: flex; flex-direction: column; gap: 2px;
    max-height: 280px; overflow-y: auto;
  }
  .vc-file-item {
    display: flex; flex-direction: column; gap: 2px;
    padding: 8px 10px; border-radius: 6px; cursor: pointer;
    background: none; border: none; text-align: left; width: 100%;
  }
  .vc-file-item:hover { background: var(--background-modifier-hover); }
  .vc-file-title { font-size: 13px; font-weight: 500; color: var(--text-normal); }
  .vc-file-path { font-size: 11px; color: var(--text-faint); }
  .vc-empty { text-align: center; color: var(--text-faint); padding: 32px 0; font-size: 13px; }
  .vc-footer {
    display: flex; justify-content: flex-end; gap: 8px;
    padding: 14px 20px; border-top: 1px solid var(--background-modifier-border);
  }
  .vc-btn-main {
    padding: 8px 20px; background: var(--interactive-accent); color: #fff;
    border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
  }
  .vc-btn-main:disabled { opacity: 0.4; cursor: not-allowed; }
  .vc-btn-cancel {
    padding: 8px 16px; background: var(--background-secondary); color: var(--text-normal);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px; cursor: pointer; font-size: 13px;
  }
  .vc-btn-cancel:hover { background: var(--background-modifier-hover); }
  .vc-success {
    padding: 12px 14px; border-radius: 8px;
    background: var(--background-modifier-success); color: var(--text-success); font-size: 13px;
  }
  .vc-error {
    padding: 10px 14px; border-radius: 8px;
    background: var(--background-modifier-error); color: var(--text-error); font-size: 12px;
  }
</style>
