<script lang="ts">
  import TopBar from './components/TopBar.svelte';
  import VaultStatsCard from './components/VaultStatsCard.svelte';
  import RecentChanges from './components/RecentChanges.svelte';
  import TagCloud from './components/TagCloud.svelte';
  import HealthSection from './components/HealthSection.svelte';
  import SuggestionList from './components/SuggestionList.svelte';
  import EmbedRefSection from './components/EmbedRefSection.svelte';
  import TaskSection from './components/TaskSection.svelte';
  import DebugPanel from './components/DebugPanel.svelte';
  import Section from './shared/Section.svelte';
  import LoadingSpinner from './shared/LoadingSpinner.svelte';
  import EmptyState from './shared/EmptyState.svelte';
  import ErrorBanner from './shared/ErrorBanner.svelte';
  import type { DebugReport } from '../utils/debug-logger';

  export let scanning: boolean = false;
  export let error: string | null = null;

  export let vaults: Array<{
    id: string; name: string; path: string; totalNotes: number; isHost: boolean;
  }> = [];

  export let stats: Array<{
    vaultId: string; vaultName: string; totalNotes: number; totalFolders: number;
    tagCount: number; added24h: number; added7d: number;
  }> = [];

  export let recentChanges: Array<{
    vaultId: string; fileName: string; title: string; mtime: number;
    folder: string; tags: string[]; isNew: boolean;
  }> = [];

  export let tagCloud: Array<{ tag: string; count: number }> = [];

  export let healthData: Array<{
    vaultId: string; vaultName: string; overall: number;
    dimensions: { activity: number; linkIntegrity: number; structure: number; updateFrequency: number; };
  }> = [];

  export let embedData: Array<{
    vaultId: string; vaultName: string; images: number; audio: number; video: number; other: number; broken: number;
  }> = [];

  export let suggestions: Array<{
    type: 'warning' | 'info' | 'tip'; message: string; vaultId?: string;
    action?: { label: string; command: string; params?: Record<string, string> };
  }> = [];

  export let tasks: Array<{
    id: string; title: string; done: boolean; vaultId: string; vaultName: string;
    fileName: string; line: number; priority: number; dueDate: string | null;
  }> = [];

  export let debugReport: DebugReport | null = null;

  export let onRefresh: () => void = () => {};
  export let onOpenNote: (vaultId: string, filePath: string) => void = () => {};
  export let onSearch: () => void = () => {};
  export let onTagClick: (tag: string) => void = () => {};
  export let onToggleDebug: (() => void) | null = null;
  export let onClearDebugLogs: (() => void) | null = null;
  export let onOpenTask: (vaultId: string, fileName: string, line: number) => void = () => {};
  export let onToggleTask: (task: {
    id: string; vaultId: string; fileName: string; title: string; done: boolean;
    line: number; dueDate: string | null; priority: number;
  }) => void = () => {};

  // null = show all, string = show specific vault
  let activeVaultId: string | null = null;

  $: activeStats = activeVaultId ? stats.filter(s => s.vaultId === activeVaultId) : stats;
  $: activeChanges = activeVaultId ? recentChanges.filter(c => c.vaultId === activeVaultId) : recentChanges;
  $: activeTasks = activeVaultId ? tasks.filter(t => t.vaultId === activeVaultId) : tasks;
  $: activeHealth = activeVaultId ? healthData.filter(h => h.vaultId === activeVaultId) : healthData;
  $: activeEmbed = activeVaultId ? embedData.filter(e => e.vaultId === activeVaultId) : embedData;
  $: activeSuggestions = activeVaultId
    ? suggestions.filter(s => !s.vaultId || s.vaultId === activeVaultId)
    : suggestions;
  $: activeTags = tagCloud;

  // Aggregated totals
  $: totalNotes = stats.reduce((sum, s) => sum + s.totalNotes, 0);
  $: totalFolders = stats.reduce((sum, s) => sum + s.totalFolders, 0);
  $: totalTags = tagCloud.length;
  $: totalAdded = stats.reduce((sum, s) => sum + s.added7d, 0);

  // 宿主库
  $: hostVault = vaults.find(v => v.isHost);
  $: externalVaults = vaults.filter(v => !v.isHost);

  // 外库卡片索引
  $: vaultStatMap = new Map(stats.map(s => [s.vaultId, s]));
  $: cardStep = 24;
  $: cardAreaH = 4 + Math.max(0, externalVaults.length - 1) * 4 + 100 + 8;

  $: hasVaultConfig = debugReport ? debugReport.vaultConfigs.length > 0 : false;
  $: hasSnapshots = debugReport ? debugReport.snapshotInfo.length > 0 : false;
  $: showDebugToggle = hasVaultConfig && !hasSnapshots && !scanning;
  $: debugEnabled = debugReport?.enabled ?? false;

  function selectVault(id: string) {
    activeVaultId = activeVaultId === id ? null : id;
  }
</script>

<div class="vc-dashboard">
  <TopBar
    onRefresh={onRefresh}
    onSearch={onSearch}
    {scanning}
    hostName={hostVault?.name ?? ''}
    hostNotes={hostVault?.totalNotes ?? 0}
    onOpenVault={hostVault ? () => selectVault(hostVault.id) : null}
  />

  <!-- 堆叠卡片区（仅外库） -->
  {#if externalVaults.length > 0}
    <div class="vc-cards-area" style="height:{cardAreaH}px">
      {#each externalVaults as vault, i (vault.id)}
        {@const s = vaultStatMap.get(vault.id)}
        {@const selected = activeVaultId === vault.id}
        <button
          class="vc-card"
          class:active={selected}
          style="left:{selected ? 'auto' : (16 + i * cardStep) + 'px'}; right:{selected ? '116px' : 'auto'}; top:{selected ? 4 : 4 + i * 4}px; --r:{selected ? 0 : (i - (externalVaults.length - 1) / 2) * 4}deg; z-index:{selected ? 200 : i}"
          on:click={() => selectVault(vault.id)}
          title={vault.path}
        >
          <span class="vc-card-icon">◇</span>
          <span class="vc-card-name">{vault.name}</span>
          <span class="vc-card-num">{vault.totalNotes}<small> 笔记</small></span>
          <span class="vc-card-num">{s?.totalFolders ?? 0}<small> 文件夹</small></span>
          <span class="vc-card-num vc-card-add">+{s?.added7d ?? 0}<small> 本周</small></span>
        </button>
      {/each}
      {#if activeVaultId !== null}
        <button
          class="vc-card"
          class:active={activeVaultId === null}
          style="right:{4}px; top:{4}px; --r:0deg; z-index:{externalVaults.length + 100}"
          on:click={() => (activeVaultId = null)} title="显示全部"
        >
          <span class="vc-card-icon">⊞</span>
          <span class="vc-card-name">全部</span>
          <span class="vc-card-num">{totalNotes}<small> 笔记</small></span>
          <span class="vc-card-num">{totalFolders}<small> 文件夹</small></span>
          <span class="vc-card-num vc-card-add">+{totalAdded}<small> 本周</small></span>
        </button>
      {/if}
    </div>
  {/if}

  {#if error}
    <ErrorBanner message={error} onRetry={onRefresh} />
  {/if}

  {#if showDebugToggle && !debugEnabled}
    <div class="vc-diagnostic">
      <span>已配置 {debugReport?.vaultConfigs.length ?? 0} 个分库但无扫描数据</span>
      <button class="vc-btn-diag" on:click={onToggleDebug}>开启调试</button>
    </div>
  {/if}

  {#if scanning}
    <LoadingSpinner message="正在扫描..." />
  {:else if vaults.length === 0}
    <EmptyState
      title="欢迎使用 Vault Commander"
      description="请先在设置中添加你的分库路径，即可开始管理所有 Obsidian 知识库。"
    />
  {:else}
    <div class="vc-content">
      {#if activeStats.length > 0}
        <Section title="统计概览" badge="">
          {#if activeVaultId === null && stats.length > 1}
            <!-- 汇总视图 -->
            <div class="vc-summary-row">
              <span class="vc-summary-item"><strong>{totalNotes}</strong><small>笔记</small></span>
              <span class="vc-summary-item"><strong>{totalFolders}</strong><small>文件夹</small></span>
              <span class="vc-summary-item"><strong>{totalTags}</strong><small>标签</small></span>
              <span class="vc-summary-item"><strong class="vc-green">+{totalAdded}</strong><small>本周</small></span>
            </div>
          {/if}
          {#each activeStats as stat}
            <VaultStatsCard {...stat} />
          {/each}
        </Section>
      {/if}

      {#if activeTasks.length > 0}
        <Section title="任务待办" badge="{activeTasks.filter(t => !t.done).length}">
          <TaskSection tasks={activeTasks} onOpenTask={onOpenTask} onToggleTask={onToggleTask} />
        </Section>
      {/if}

      {#if activeChanges.length > 0}
        <Section title="最近更新" badge="{activeChanges.length}" defaultOpen={false}>
          <RecentChanges changes={activeChanges} {onOpenNote} />
        </Section>
      {/if}

      {#if activeTags.length > 0}
        <Section title="标签云" badge="{activeTags.length}" defaultOpen={false}>
          <TagCloud tags={activeTags} {onTagClick} />
        </Section>
      {/if}

      {#if activeEmbed.length > 0}
        <Section title="嵌入引用" defaultOpen={false}>
          <EmbedRefSection embedData={activeEmbed} />
        </Section>
      {/if}

      {#if activeHealth.length > 0}
        <Section title="库健康度" defaultOpen={false}>
          <HealthSection healthData={activeHealth} />
        </Section>
      {/if}

      {#if activeSuggestions.length > 0}
        <Section title="建议" badge="{activeSuggestions.length}" defaultOpen={false}>
          <SuggestionList suggestions={activeSuggestions} />
        </Section>
      {/if}
    </div>
  {/if}

  <div class="vc-footer">
    <span>快照 {debugReport?.snapshotInfo.length ?? 0}/{debugReport?.vaultConfigs.length ?? 0}</span>
    {#if activeVaultId === null}
      <span>汇总视图</span>
    {:else}
      <span>已筛选</span>
    {/if}
    {#if debugReport && debugReport.errors.length > 0}
      <span class="vc-foot-err">{debugReport.errors.length} 错误</span>
    {/if}
    <button class="vc-foot-btn" on:click={onToggleDebug}>
      {debugEnabled ? '关闭调试' : '调试'}
    </button>
  </div>

  <DebugPanel report={debugReport} onClear={onClearDebugLogs} />
</div>

<style>
  .vc-dashboard {
    padding: 0;
    font-family: var(--font-interface);
    color: var(--text-normal);
    background: var(--background-primary);
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  /* 堆叠卡片 */
  .vc-cards-area {
    position: relative;
    padding: 8px 16px 14px;
    flex-shrink: 0;
  }
  .vc-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    width: 100px;
    height: 100px;
    padding: 8px 6px;
    background: var(--background-secondary);
    border: 1.5px solid var(--background-modifier-border);
    border-radius: 14px;
    cursor: pointer;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.35s ease, box-shadow 0.3s ease, border-color 0.2s;
    position: absolute;
    transform: rotate(var(--r, 0deg));
  }
  .vc-card:hover {
    transform: rotate(var(--r, 0deg)) translateY(-12px);
    border-color: var(--interactive-accent);
    box-shadow: 0 10px 24px rgba(0,0,0,0.15);
    z-index: 99 !important;
  }
  .vc-card.active {
    transform: rotate(var(--r, 0deg)) translateY(-16px);
    border-color: var(--interactive-accent);
    box-shadow: 0 12px 32px rgba(0,0,0,0.22);
    background: var(--background-primary);
    z-index: 100 !important;
  }
  .vc-card-icon {
    font-size: 16px;
    color: var(--interactive-accent);
    line-height: 1;
  }
  .vc-card-name {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-normal);
    max-width: 84px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .vc-card-num {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
  }
  .vc-card-num small {
    font-size: 9px;
    font-weight: 400;
    color: var(--text-faint);
  }
  .vc-card-add {
    color: var(--color-green);
  }
  /* 汇总 */
  .vc-summary-row {
    display: flex; gap: 24px; padding: 8px 0 4px;
    border-bottom: 1px solid var(--background-modifier-border-hover);
    margin-bottom: 4px;
  }
  .vc-summary-item {
    display: flex; align-items: baseline; gap: 3px;
    font-size: 14px; color: var(--text-muted);
  }
  .vc-summary-item strong { color: var(--text-normal); font-weight: 700; font-size: 18px; }
  .vc-summary-item small { font-size: 11px; color: var(--text-faint); }
  .vc-green { color: var(--color-green); }
  /* 内容 */
  .vc-content { padding: 8px 14px 14px; flex: 1; }
  .vc-diagnostic {
    display: flex; align-items: center; justify-content: space-between;
    padding: 6px 14px;
    background: var(--background-modifier-error);
    color: var(--text-error); font-size: 11px;
  }
  .vc-btn-diag {
    padding: 2px 10px; font-size: 10px;
    background: var(--text-error); color: var(--background-primary);
    border: none; border-radius: 4px; cursor: pointer;
  }
  .vc-footer {
    display: flex; align-items: center; gap: 14px;
    padding: 6px 14px;
    border-top: 1px solid var(--background-modifier-border);
    font-size: 10px; color: var(--text-faint); flex-shrink: 0;
  }
  .vc-foot-err { color: var(--text-error); font-weight: 600; }
  .vc-foot-btn {
    margin-left: auto; padding: 2px 8px;
    background: none; border: 1px solid var(--background-modifier-border);
    border-radius: 4px; cursor: pointer; color: var(--text-faint); font-size: 10px;
  }
  .vc-foot-btn:hover { color: var(--text-normal); border-color: var(--text-muted); }
</style>
