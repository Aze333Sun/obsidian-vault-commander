<script lang="ts">
  import type { SearchResult } from '../../types/search';

  export let visible: boolean = false;

  let query: string = '';
  let results: SearchResult[] = [];
  let searching: boolean = false;
  let error: string | null = null;
  let selectedIndex: number = -1;
  let hasSearched: boolean = false;
  let searchHistory: string[] = [];

  export let onSearch: (q: string) => Promise<SearchResult[]> = async () => [];
  export let onOpenNote: (vaultId: string, filePath: string) => void = () => {};
  export let onClose: () => void = () => {};

  let inputEl: HTMLInputElement;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function highlightText(text: string, term: string): string {
    if (!term) return escapeHtml(text);
    const escaped = escapeHtml(text);
    const regex = new RegExp(`(${escapeHtml(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return escaped.replace(regex, '<mark>$1</mark>');
  }

  function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatTime(ts: number): string {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}分钟前`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}天前`;
    return new Date(ts).toLocaleDateString('zh-CN');
  }

  function doSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    const q = query.trim();
    if (!q) { results = []; hasSearched = false; selectedIndex = -1; return; }
    debounceTimer = setTimeout(async () => {
      if (!query.trim()) return;
      searching = true; error = null; hasSearched = true; selectedIndex = -1;
      try {
        results = await onSearch(query.trim());
        if (results.length > 0) addToHistory(query.trim());
      } catch (e) {
        error = e instanceof Error ? e.message : '搜索失败';
        results = [];
      } finally { searching = false; }
    }, 200);
  }

  function addToHistory(q: string) {
    searchHistory = searchHistory.filter((h) => h !== q);
    searchHistory.unshift(q);
    if (searchHistory.length > 10) searchHistory.pop();
  }

  function clearHistory() { searchHistory = []; }
  function selectHistory(q: string) { query = q; doSearch(); }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      if (query) { query = ''; results = []; hasSearched = false; }
      else onClose();
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, results.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, -1); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const r = results[selectedIndex]; onOpenNote(r.vaultId, r.fileName); onClose();
      } else { doSearch(); }
    }
  }

  function handleResultClick(r: SearchResult) { onOpenNote(r.vaultId, r.fileName); onClose(); }

  $: if (visible) setTimeout(() => inputEl?.focus(), 50);
  $: if (!visible) { query = ''; results = []; searching = false; error = null; hasSearched = false; selectedIndex = -1; }
</script>

{#if visible}
  <div class="vc-overlay" on:click={onClose}>
    <div class="vc-modal" on:click|stopPropagation on:keydown={handleKeydown} role="dialog" aria-modal="true">
      <div class="vc-header">
        <div class="vc-input-box">
          <svg class="vc-search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input bind:this={inputEl} class="vc-input" type="text" placeholder="搜索笔记..." bind:value={query} on:input={doSearch} />
          {#if query}
            <button class="vc-clear" on:click={() => { query = ''; results = []; hasSearched = false; }}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          {/if}
        </div>
      </div>

      <div class="vc-body">
        {#if searching}
          <div class="vc-status">搜索中...</div>
        {:else if error}
          <div class="vc-status vc-err">{error}</div>
        {:else if hasSearched && results.length === 0}
          <div class="vc-status">未找到匹配的笔记</div>
        {:else if !hasSearched && !query && searchHistory.length > 0}
          <div class="vc-history">
            <div class="vc-history-head">
              <span>搜索历史</span>
              <button on:click={clearHistory}>清空</button>
            </div>
            {#each searchHistory as h}
              <button class="vc-history-item" on:click={() => selectHistory(h)}>{h}</button>
            {/each}
          </div>
        {:else if results.length > 0}
          <div class="vc-results">
            {#each results as r, i}
              <button
                class="vc-result"
                class:selected={i === selectedIndex}
                on:click={() => handleResultClick(r)}
              >
                <div class="vc-result-title">{@html highlightText(r.title || r.fileName, query)}</div>
                <div class="vc-result-meta">{r.vaultName} · {formatTime(r.mtime)}</div>
              </button>
            {/each}
          </div>
        {:else}
          <div class="vc-status">输入关键词开始搜索</div>
        {/if}
      </div>

      <div class="vc-footer">
        <span>↑↓ 导航</span>
        <span>Enter 打开</span>
        <span>Esc 关闭</span>
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
    width: 540px;
    max-height: 68vh;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .vc-header { padding: 14px 16px 10px; }
  .vc-input-box {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 14px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    background: var(--background-secondary);
    transition: border-color 0.2s;
  }
  .vc-input-box:focus-within {
    border-color: var(--interactive-accent);
    background: var(--background-primary);
  }
  .vc-search-icon { color: var(--text-muted); flex-shrink: 0; }
  .vc-input {
    flex: 1; border: none; background: none; outline: none;
    font-size: 15px; color: var(--text-normal);
    font-family: var(--font-interface);
  }
  .vc-input::placeholder { color: var(--text-faint); }
  .vc-clear {
    background: none; border: none; cursor: pointer; padding: 2px;
    color: var(--text-muted); border-radius: 4px;
    display: flex;
  }
  .vc-clear:hover { color: var(--text-normal); background: var(--background-modifier-hover); }
  .vc-body { flex: 1; overflow-y: auto; padding: 0 12px 12px; min-height: 60px; }
  .vc-status { text-align: center; color: var(--text-muted); padding: 48px 0; font-size: 13px; }
  .vc-err { color: var(--text-error); }

  .vc-history { display: flex; flex-direction: column; gap: 2px; }
  .vc-history-head {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 4px; font-size: 11px; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .vc-history-head button { background: none; border: none; color: var(--text-accent); cursor: pointer; font-size: 11px; }
  .vc-history-item {
    display: block; width: 100%; text-align: left; background: none; border: none;
    color: var(--text-normal); padding: 8px 12px; border-radius: 8px;
    cursor: pointer; font-size: 13px;
  }
  .vc-history-item:hover { background: var(--background-modifier-hover); }

  .vc-results { display: flex; flex-direction: column; gap: 6px; }
  .vc-result {
    display: block; width: 100%; text-align: left;
    padding: 14px 16px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    background: var(--background-primary);
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .vc-result:hover, .vc-result.selected {
    border-color: var(--interactive-accent);
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  }
  .vc-result-title {
    font-size: 14px; font-weight: 500; color: var(--text-normal);
    margin-bottom: 4px;
  }
  .vc-result-meta {
    font-size: 11px; color: var(--text-faint);
    display: flex; gap: 4px;
  }
  .vc-footer {
    display: flex; gap: 16px;
    padding: 8px 16px;
    border-top: 1px solid var(--background-modifier-border);
    font-size: 11px; color: var(--text-faint);
  }
  :global(mark) {
    background: var(--text-highlight-bg);
    color: var(--text-normal);
    border-radius: 2px;
    padding: 0 1px;
  }
</style>
