<script lang="ts">
  import type { SearchResult } from '../../types/search';

  export let visible: boolean = false;

  // Search state
  let query: string = '';
  let results: SearchResult[] = [];
  let searching: boolean = false;
  let error: string | null = null;
  let selectedIndex: number = -1;
  let hasSearched: boolean = false;

  // History
  let searchHistory: string[] = [];

  // Props from parent
  export let onSearch: (q: string) => Promise<SearchResult[]> = async () => [];
  export let onOpenNote: (vaultId: string, filePath: string) => void = () => {};
  export let onClose: () => void = () => {};

  let inputEl: HTMLInputElement;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Group results by vault
  $: resultsByVault = groupByVault(results);

  function groupByVault(items: SearchResult[]): Map<string, SearchResult[]> {
    const map = new Map<string, SearchResult[]>();
    for (const item of items) {
      const key = item.vaultName || item.vaultId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }

  function highlightText(text: string, term: string): string {
    if (!term) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const termEscaped = escapeHtml(term);
    const regex = new RegExp(`(${termEscaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function doSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);

    const q = query.trim();
    if (!q) {
      results = [];
      hasSearched = false;
      selectedIndex = -1;
      return;
    }

    debounceTimer = setTimeout(async () => {
      if (!query.trim()) return;

      searching = true;
      error = null;
      hasSearched = true;
      selectedIndex = -1;

      try {
        results = await onSearch(query.trim());
        if (results.length > 0) {
          addToHistory(query.trim());
        }
      } catch (err) {
        error = err instanceof Error ? err.message : '搜索失败';
        results = [];
      } finally {
        searching = false;
      }
    }, 200);
  }

  function addToHistory(q: string) {
    searchHistory = searchHistory.filter((h) => h !== q);
    searchHistory.unshift(q);
    if (searchHistory.length > 10) searchHistory.pop();
  }

  function clearHistory() {
    searchHistory = [];
  }

  function selectHistory(q: string) {
    query = q;
    doSearch();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (query) {
        query = '';
        results = [];
        hasSearched = false;
      } else {
        onClose();
      }
      return;
    }

    const allResults = getAllFlatResults();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, allResults.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < allResults.length) {
        const r = allResults[selectedIndex];
        onOpenNote(r.vaultId, r.fileName || r.fullPath);
        onClose();
      } else {
        doSearch();
      }
    }
  }

  function getAllFlatResults(): SearchResult[] {
    const flat: SearchResult[] = [];
    for (const [, items] of resultsByVault) {
      flat.push(...items);
    }
    return flat;
  }

  function handleResultClick(r: SearchResult) {
    onOpenNote(r.vaultId, r.fileName || r.fullPath);
    onClose();
  }

  function getGlobalIdx(vi: number, ri: number): number {
    let idx = 0;
    const entries = [...resultsByVault.entries()];
    for (let i = 0; i < vi; i++) {
      idx += entries[i][1].length;
    }
    return idx + ri;
  }

  // Focus input on mount
  $: if (visible) {
    setTimeout(() => inputEl?.focus(), 50);
  }

  // Reset state when closed
  $: if (!visible) {
    query = '';
    results = [];
    searching = false;
    error = null;
    hasSearched = false;
    selectedIndex = -1;
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <button class="vc-search-overlay" on:click={onClose}>
    <div class="vc-search-modal" on:click|stopPropagation on:keydown={handleKeydown} role="dialog" aria-modal="true">
      <!-- Search input -->
      <div class="vc-search-header">
        <div class="vc-search-input-wrapper">
          <span class="vc-search-icon">🔍</span>
          <input
            bind:this={inputEl}
            class="vc-search-input"
            type="text"
            placeholder="跨库搜索笔记..."
            bind:value={query}
            on:input={doSearch}
          />
          {#if query}
            <button
              class="vc-search-clear"
              on:click={() => { query = ''; results = []; hasSearched = false; }}
            >✕</button>
          {/if}
        </div>
      </div>

      <!-- Content area -->
      <div class="vc-search-body">
        {#if searching}
          <div class="vc-search-status">搜索中...</div>
        {:else if error}
          <div class="vc-search-status vc-search-error">{error}</div>
        {:else if hasSearched && results.length === 0}
          <div class="vc-search-status">未找到匹配的笔记</div>
        {:else if !hasSearched && !query && searchHistory.length > 0}
          <!-- Recent searches -->
          <div class="vc-search-history">
            <div class="vc-search-history-header">
              <span>搜索历史</span>
              <button class="vc-search-history-clear" on:click={clearHistory}>清空</button>
            </div>
            {#each searchHistory as hist}
              <button class="vc-search-history-item" on:click={() => selectHistory(hist)}>
                {hist}
              </button>
            {/each}
          </div>
        {:else if results.length > 0}
          <!-- Results by vault -->
          <div class="vc-search-results">
            {#each [...resultsByVault.entries()] as [vaultName, vaultResults], vi}
              <div class="vc-search-vault-group">
                <div class="vc-search-vault-name">{vaultName} ({vaultResults.length})</div>
                {#each vaultResults as result, ri}
                  {@const globalIdx = getGlobalIdx(vi, ri)}
                  <button
                    class="vc-search-result-item"
                    class:vc-search-result-selected={globalIdx === selectedIndex}
                    on:click={() => handleResultClick(result)}
                  >
                    <div class="vc-search-result-title">
                      {@html highlightText(result.title || result.fileName, query)}
                    </div>
                    <div class="vc-search-result-path">{result.fileName || result.fullPath}</div>
                    {#if result.matches.length > 0}
                      <div class="vc-search-result-context">
                        {@html highlightText(result.matches[0].content, query)}
                      </div>
                    {/if}
                  </button>
                {/each}
              </div>
            {/each}
          </div>
        {:else if !query}
          <div class="vc-search-status">输入关键词开始搜索</div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="vc-search-footer">
        <span class="vc-search-footer-item">↑↓ 导航</span>
        <span class="vc-search-footer-item">Enter 打开</span>
        <span class="vc-search-footer-item">Esc 关闭</span>
      </div>
    </div>
  </button>
{/if}


<style>
  .vc-search-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    z-index: 1000;
  }
  .vc-search-modal {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-l);
    box-shadow: var(--shadow-l);
    width: 560px;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .vc-search-header {
    padding: var(--size-4-2);
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .vc-search-input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--size-4-1);
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-m);
    padding: var(--size-4-1) var(--size-4-2);
  }
  .vc-search-icon {
    font-size: var(--font-ui-small);
    opacity: 0.5;
    flex-shrink: 0;
  }
  .vc-search-input {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--text-normal);
    font-size: var(--font-ui-medium);
    outline: none;
    font-family: var(--font-interface);
  }
  .vc-search-clear {
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    padding: 0 4px;
    font-size: var(--font-ui-small);
    border-radius: var(--radius-s);
  }
  .vc-search-clear:hover {
    color: var(--text-normal);
    background: var(--background-modifier-hover);
  }
  .vc-search-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--size-4-2);
    min-height: 60px;
  }
  .vc-search-status {
    text-align: center;
    color: var(--text-muted);
    padding: var(--size-4-6) 0;
    font-size: var(--font-ui-small);
  }
  .vc-search-error {
    color: var(--text-error);
  }
  .vc-search-history {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .vc-search-history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--size-4-1) 0;
    font-size: var(--font-smallest);
    color: var(--text-muted);
    text-transform: uppercase;
  }
  .vc-search-history-clear {
    background: none;
    border: none;
    color: var(--text-accent);
    cursor: pointer;
    font-size: var(--font-smallest);
  }
  .vc-search-history-item {
    display: block;
    width: 100%;
    text-align: left;
    background: none;
    border: none;
    color: var(--text-normal);
    padding: var(--size-4-1) var(--size-4-2);
    border-radius: var(--radius-s);
    cursor: pointer;
    font-size: var(--font-ui-small);
  }
  .vc-search-history-item:hover {
    background: var(--background-modifier-hover);
  }
  .vc-search-results {
    display: flex;
    flex-direction: column;
    gap: var(--size-4-1);
  }
  .vc-search-vault-group {
    margin-bottom: var(--size-4-1);
  }
  .vc-search-vault-name {
    font-size: var(--font-smallest);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    padding: var(--size-4-1) 0;
    letter-spacing: 0.05em;
  }
  .vc-search-result-item {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: var(--radius-s);
    padding: var(--size-4-1) var(--size-4-2);
    margin-bottom: 2px;
    cursor: pointer;
    transition: border-color 0.15s ease;
    font-family: var(--font-interface);
  }
  .vc-search-result-item:hover,
  .vc-search-result-selected {
    border-color: var(--interactive-accent);
  }
  .vc-search-result-title {
    font-size: var(--font-ui-small);
    font-weight: 500;
    color: var(--text-normal);
  }
  .vc-search-result-path {
    font-size: var(--font-smallest);
    color: var(--text-faint);
    margin-top: 1px;
  }
  .vc-search-result-context {
    font-size: var(--font-smallest);
    color: var(--text-muted);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .vc-search-footer {
    display: flex;
    gap: var(--size-4-2);
    padding: var(--size-4-1) var(--size-4-2);
    border-top: 1px solid var(--background-modifier-border);
    font-size: var(--font-smallest);
    color: var(--text-faint);
  }
  .vc-search-footer-item {
    color: var(--text-faint);
  }

  :global(mark) {
    background: var(--text-highlight-bg);
    color: var(--text-normal);
    border-radius: 2px;
  }
</style>
