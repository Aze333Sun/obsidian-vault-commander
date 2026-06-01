<script lang="ts">
  export let visible: boolean = false;
  export let onClose: () => void = () => {};

  // Vault options
  export let vaults: Array<{ id: string; name: string }> = [];

  // Async data fetchers
  export let getFolders: (vaultId: string) => Promise<string[]> = async () => ['/'];
  export let getTemplates: (vaultId: string) => Promise<Array<{ name: string; path: string }>> = async () => [];

  // Create callback
  export let onCreate: (params: {
    title: string;
    vaultId: string;
    folder: string;
    templateId?: string;
    openAfterCreate: boolean;
    onConflict: 'cancel' | 'rename' | 'overwrite';
  }) => Promise<{ success: boolean; filePath: string; error?: string }> = async () => ({ success: false, filePath: '' });

  // Form state
  let title: string = '';
  let selectedVaultId: string = '';
  let selectedFolder: string = '/';
  let selectedTemplate: string = '';
  let openAfterCreate: boolean = true;
  let onConflict: 'cancel' | 'rename' | 'overwrite' = 'cancel';

  // Dynamic data
  let folders: string[] = ['/'];
  let templates: Array<{ name: string; path: string }> = [];
  let creating: boolean = false;
  let error: string | null = null;
  let successMessage: string | null = null;

  let titleInput: HTMLInputElement;

  // Previous selection memory (simple in-memory)
  let lastVaultId: string = '';
  let lastFolder: string = '/';

  // Init defaults
  $: if (visible && vaults.length > 0) {
    selectedVaultId = lastVaultId || vaults[0].id;
    selectedFolder = lastFolder;
    title = '';
    error = null;
    successMessage = null;
    creating = false;
    setTimeout(() => titleInput?.focus(), 50);
  }

  // Load folders and templates when vault changes
  $: if (selectedVaultId && visible) {
    loadVaultData(selectedVaultId);
  }

  async function loadVaultData(vaultId: string) {
    folders = await getFolders(vaultId);
    templates = await getTemplates(vaultId);
    if (!folders.includes(selectedFolder)) {
      selectedFolder = '/';
    }
  }

  async function handleCreate() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      error = '请输入笔记标题';
      return;
    }
    if (!selectedVaultId) {
      error = '请选择目标库';
      return;
    }

    creating = true;
    error = null;

    try {
      const result = await onCreate({
        title: trimmedTitle,
        vaultId: selectedVaultId,
        folder: selectedFolder,
        templateId: selectedTemplate || undefined,
        openAfterCreate,
        onConflict,
      });

      if (result.success) {
        lastVaultId = selectedVaultId;
        lastFolder = selectedFolder;
        successMessage = `已创建于 ${result.filePath}`;
        title = '';
        setTimeout(() => onClose(), 800);
      } else {
        error = result.error || '创建失败';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : '创建失败';
    } finally {
      creating = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !creating) {
      e.preventDefault();
      handleCreate();
    }
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="vc-modal-overlay" role="dialog" aria-modal="true" on:click={onClose}>
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="vc-modal" on:click|stopPropagation on:keydown={handleKeydown}>
      <div class="vc-modal-header">
        <h2 class="vc-modal-title">新建笔记</h2>
        <button class="vc-modal-close" on:click={onClose}>✕</button>
      </div>

      <div class="vc-modal-body">
        {#if successMessage}
          <div class="vc-success-banner">{successMessage}</div>
        {/if}

        {#if error}
          <div class="vc-error-banner">{error}</div>
        {/if}

        <!-- Title -->
        <div class="vc-field">
          <label class="vc-label" for="vc-note-title">笔记标题</label>
          <input
            id="vc-note-title"
            bind:this={titleInput}
            class="vc-input"
            type="text"
            placeholder="输入笔记标题"
            bind:value={title}
            disabled={creating}
          />
        </div>

        <!-- Vault selection -->
        <div class="vc-field">
          <label class="vc-label" for="vc-note-vault">目标库</label>
          <select
            id="vc-note-vault"
            class="vc-select"
            bind:value={selectedVaultId}
            disabled={creating || vaults.length === 0}
          >
            {#each vaults as vault}
              <option value={vault.id}>{vault.name}</option>
            {/each}
          </select>
          {#if vaults.length === 0}
            <p class="vc-hint">请先在设置中添加分库</p>
          {/if}
        </div>

        <!-- Folder selection -->
        <div class="vc-field">
          <label class="vc-label" for="vc-note-folder">目标文件夹</label>
          <select
            id="vc-note-folder"
            class="vc-select"
            bind:value={selectedFolder}
            disabled={creating || folders.length === 0}
          >
            {#each folders as folder}
              <option value={folder}>{folder}</option>
            {/each}
          </select>
        </div>

        <!-- Template selection -->
        <div class="vc-field">
          <label class="vc-label" for="vc-note-template">模板（可选）</label>
          <select
            id="vc-note-template"
            class="vc-select"
            bind:value={selectedTemplate}
            disabled={creating || templates.length === 0}
          >
            <option value="">不使用模板</option>
            {#each templates as tpl}
              <option value={tpl.path}>{tpl.name}</option>
            {/each}
          </select>
          {#if templates.length === 0 && selectedVaultId}
            <p class="vc-hint">此库暂无模板文件</p>
          {/if}
        </div>

        <!-- Options -->
        <div class="vc-field">
          <label class="vc-checkbox-label">
            <input type="checkbox" bind:checked={openAfterCreate} disabled={creating} />
            创建后立即打开
          </label>
        </div>

        {#if false}
        <!-- Conflict strategy (hidden, default: cancel) -->
        <div class="vc-field">
          <label class="vc-label">冲突处理</label>
          <select class="vc-select" bind:value={onConflict} disabled={creating}>
            <option value="cancel">取消创建</option>
            <option value="rename">自动重命名</option>
            <option value="overwrite">覆盖已有</option>
          </select>
        </div>
        {/if}
      </div>

      <div class="vc-modal-footer">
        <button class="vc-btn vc-btn-secondary" on:click={onClose} disabled={creating}>取消</button>
        <button class="vc-btn vc-btn-primary" on:click={handleCreate} disabled={creating || !title.trim()}>
          {creating ? '创建中...' : '创建笔记'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .vc-modal-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex; align-items: flex-start; justify-content: center;
    padding-top: 10vh; z-index: 1000;
  }
  .vc-modal {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-l);
    box-shadow: var(--shadow-l);
    width: 480px; max-height: 75vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .vc-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: var(--size-4-3); border-bottom: 1px solid var(--background-modifier-border);
  }
  .vc-modal-title { margin: 0; font-size: var(--font-ui-medium); font-weight: 600; }
  .vc-modal-close {
    background: none; border: none; color: var(--text-muted); cursor: pointer;
    font-size: var(--font-ui-medium); padding: 2px 6px; border-radius: var(--radius-s);
  }
  .vc-modal-close:hover { background: var(--background-modifier-hover); }
  .vc-modal-body {
    flex: 1; overflow-y: auto; padding: var(--size-4-3); display: flex; flex-direction: column; gap: var(--size-4-2);
  }
  .vc-modal-footer {
    display: flex; justify-content: flex-end; gap: var(--size-4-1);
    padding: var(--size-4-2) var(--size-4-3); border-top: 1px solid var(--background-modifier-border);
  }
  .vc-field { display: flex; flex-direction: column; gap: 4px; }
  .vc-label { font-size: var(--font-ui-small); font-weight: 500; color: var(--text-muted); }
  .vc-input, .vc-select {
    padding: var(--size-4-1) var(--size-4-2);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: var(--font-ui-small);
    font-family: var(--font-interface);
  }
  .vc-input:focus, .vc-select:focus {
    border-color: var(--interactive-accent); outline: none;
  }
  .vc-input:disabled, .vc-select:disabled { opacity: 0.6; }
  .vc-checkbox-label {
    display: flex; align-items: center; gap: var(--size-4-1);
    font-size: var(--font-ui-small); color: var(--text-muted); cursor: pointer;
  }
  .vc-hint { font-size: var(--font-smallest); color: var(--text-faint); margin: 0; }
  .vc-btn {
    padding: var(--size-4-1) var(--size-4-3);
    border-radius: var(--radius-s); border: none; cursor: pointer;
    font-size: var(--font-ui-small); font-family: var(--font-interface);
  }
  .vc-btn-primary { background: var(--interactive-accent); color: var(--text-on-accent); }
  .vc-btn-primary:hover { background: var(--interactive-accent-hover); }
  .vc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .vc-btn-secondary { background: var(--background-secondary); color: var(--text-normal); border: 1px solid var(--background-modifier-border); }
  .vc-btn-secondary:hover { background: var(--background-modifier-hover); }
  .vc-success-banner {
    padding: var(--size-4-1) var(--size-4-2); border-radius: var(--radius-s);
    background: var(--background-modifier-success); color: var(--text-success);
    font-size: var(--font-small);
  }
  .vc-error-banner {
    padding: var(--size-4-1) var(--size-4-2); border-radius: var(--radius-s);
    background: var(--background-modifier-error); color: var(--text-error);
    font-size: var(--font-small);
  }
</style>
