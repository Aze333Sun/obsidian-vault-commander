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
  export let tagCloud: Array<{ tag: string; count: number; vaultId: string }> = [];
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

  // --- Active vault ---
  let activeVaultId: string | null = null;
  let initialized = false;
  $: if (!initialized && vaults.length > 0) { activeVaultId = vaults[0].id; initialized = true; }

  $: hostVault = vaults.find(v => v.isHost);
  $: externalVaults = vaults.filter(v => !v.isHost);
  $: vaultStatMap = new Map(stats.map(s => [s.vaultId, s]));

  $: activeHealthVaultId = activeVaultId && !vaults.find(v => v.id === activeVaultId)?.isHost
    ? activeVaultId : (hostVault?.id ?? '');
  $: activeHealthData = healthData.find(h => h.vaultId === activeHealthVaultId);

  function selectVault(id: string) { activeVaultId = activeVaultId === id ? null : id; }

  // --- Filtered data ---
  $: activeStats = activeVaultId ? stats.filter(s => s.vaultId === activeVaultId) : stats;
  $: activeChanges = activeVaultId ? recentChanges.filter(c => c.vaultId === activeVaultId) : recentChanges;
  $: activeTasks = activeVaultId ? tasks.filter(t => t.vaultId === activeVaultId) : tasks;
  $: activeHealth = activeVaultId ? healthData.filter(h => h.vaultId === activeVaultId) : healthData;
  $: activeEmbed = activeVaultId ? embedData.filter(e => e.vaultId === activeVaultId) : embedData;
  $: activeSuggestions = activeVaultId
    ? suggestions.filter(s => !s.vaultId || s.vaultId === activeVaultId) : suggestions;
  $: activeTags = (activeVaultId ? tagCloud.filter(t => t.vaultId === activeVaultId) : tagCloud).slice(0, 20);

  $: totalNotes = stats.reduce((sum, s) => sum + s.totalNotes, 0);
  $: totalFolders = stats.reduce((sum, s) => sum + s.totalFolders, 0);
  $: totalAdded = stats.reduce((sum, s) => sum + s.added7d, 0);

  $: cardStep = 24;
  $: cardAreaH = Math.max(80, 4 + Math.max(0, externalVaults.length - 1) * 4 + 100 + 8);

  $: hasContent = stats.length > 0 || recentChanges.length > 0 || tasks.length > 0;
  $: showDebugToggle = (debugReport?.vaultConfigs?.length ?? 0) > 0 && (debugReport?.snapshotInfo?.length ?? 0) === 0 && !scanning;
  $: debugEnabled = debugReport?.enabled ?? false;

  // --- Draggable slot layout ---
  type SectionKey = 'stats' | 'tasks' | 'recent' | 'health' | 'suggestions' | 'embed' | 'otherVaults' | 'empty';

  interface Slot {
    id: number;
    col: 0 | 1;
    key: SectionKey;
  }

  let slots: Slot[] = [
    { id: 0, col: 0, key: 'stats' },
    { id: 1, col: 0, key: 'tasks' },
    { id: 2, col: 0, key: 'recent' },
    { id: 3, col: 0, key: 'health' },
    { id: 4, col: 0, key: 'suggestions' },
    { id: 5, col: 0, key: 'embed' },
    { id: 6, col: 0, key: 'otherVaults' },
    { id: 7, col: 0, key: 'empty' },
    { id: 8, col: 1, key: 'empty' },
    { id: 9, col: 1, key: 'empty' },
    { id: 10, col: 1, key: 'empty' },
    { id: 11, col: 1, key: 'empty' },
    { id: 12, col: 1, key: 'empty' },
    { id: 13, col: 1, key: 'empty' },
    { id: 14, col: 1, key: 'empty' },
    { id: 15, col: 1, key: 'empty' },
  ];

  $: leftSlots = slots.filter(s => s.col === 0).sort((a, b) => a.id - b.id);
  $: rightSlots = slots.filter(s => s.col === 1).sort((a, b) => a.id - b.id);

  let dragSlot: number | null = null;

  function onDragStart(e: DragEvent, slotId: number) {
    dragSlot = slotId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(slotId));
    }
  }

  function onDragOver(e: DragEvent, slotId: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }

  function onDrop(e: DragEvent, targetId: number) {
    e.preventDefault();
    if (dragSlot === null || dragSlot === targetId) { dragSlot = null; return; }
    const src = slots.find(s => s.id === dragSlot);
    const dst = slots.find(s => s.id === targetId);
    if (!src || !dst) { dragSlot = null; return; }
    // Swap keys
    const tmp = src.key;
    src.key = dst.key;
    dst.key = tmp;
    slots = slots;
    dragSlot = null;
  }

  // Check if section has data
  function hasData(key: SectionKey): boolean {
    switch (key) {
      case 'stats': return activeStats.length > 0;
      case 'tasks': return activeTasks.length > 0;
      case 'recent': return activeChanges.length > 0;
      case 'health': return activeHealth.length > 0;
      case 'suggestions': return activeSuggestions.length > 0;
      case 'embed': return activeEmbed.length > 0;
      case 'otherVaults': return vaults.length > 1;
      default: return false;
    }
  }

  function sectionBadge(key: SectionKey): string {
    switch (key) {
      case 'tasks': return `${activeTasks.filter(t => !t.done).length}`;
      case 'recent': return `${activeChanges.length}`;
      case 'suggestions': return `${activeSuggestions.length}`;
      case 'otherVaults': return `${vaults.length - 1}`;
      default: return '';
    }
  }
</script>

<div class="vc-dashboard">
  <TopBar
    onRefresh={onRefresh} onSearch={onSearch} {scanning}
    hostName={hostVault?.name ?? ''}
    hostNotes={hostVault?.totalNotes ?? 0}
    showHealth={!!activeHealthData}
    healthScore={activeHealthData?.overall ?? 0}
    healthActivity={activeHealthData?.dimensions?.activity ?? 0}
    healthLinks={activeHealthData?.dimensions?.linkIntegrity ?? 0}
    healthLabel={activeHealthData?.vaultName ?? ''}
    onOpenVault={hostVault ? () => selectVault(hostVault.id) : null}
  />

  {#if error}<ErrorBanner message={error} onRetry={onRefresh} />{/if}
  {#if showDebugToggle && !debugEnabled}
    <div class="vc-diagnostic">
      <span>已配置 {debugReport?.vaultConfigs.length ?? 0} 个分库但无扫描数据</span>
      <button class="vc-btn-diag" on:click={onToggleDebug}>开启调试</button>
    </div>
  {/if}

  {#if scanning}
    <LoadingSpinner message="正在扫描..." />
  {:else if vaults.length === 0}
    <EmptyState title="欢迎使用 Vault Commander" description="请先在设置中添加你的分库路径。" />
  {:else}
    <!-- Cards + tags row -->
    {#if externalVaults.length > 0}
      <div class="vc-cards-area" style="height:{cardAreaH}px">
        {#each externalVaults as vault, i (vault.id)}
          {@const s = vaultStatMap.get(vault.id)}
          {@const selected = activeVaultId === vault.id}
          <button class="vc-card" class:active={selected}
            style="left:{selected ? 'auto' : (16 + i * cardStep) + 'px'}; right:{selected ? '116px' : 'auto'}; top:{selected ? 4 : 4 + i * 4}px; --r:{selected ? 0 : (i - (externalVaults.length - 1) / 2) * 4}deg; z-index:{selected ? 200 : i}"
            on:click={() => selectVault(vault.id)} title={vault.path}>
            <span class="vc-card-icon">◇</span>
            <span class="vc-card-name">{vault.name}</span>
            <span class="vc-card-num">{vault.totalNotes}<small> 笔记</small></span>
            <span class="vc-card-num">{s?.totalFolders ?? 0}<small> 文件夹</small></span>
            <span class="vc-card-num vc-card-add">+{s?.added7d ?? 0}<small> 本周</small></span>
          </button>
        {/each}
        {#if activeVaultId !== null}
          <button class="vc-card" class:active={activeVaultId === null}
            style="right:4px; top:4px; --r:0deg; z-index:{externalVaults.length + 100}"
            on:click={() => (activeVaultId = null)} title="显示全部">
            <span class="vc-card-icon">⊞</span><span class="vc-card-name">全部</span>
            <span class="vc-card-num">{totalNotes}<small> 笔记</small></span>
            <span class="vc-card-num">{totalFolders}<small> 文件夹</small></span>
            <span class="vc-card-num vc-card-add">+{totalAdded}<small> 本周</small></span>
          </button>
        {/if}
        {#if activeTags.length > 0}
          <div class="vc-tags-inline" style="right:{activeVaultId !== null ? '228px' : '8px'}">
            <TagCloud tags={activeTags} {onTagClick} />
          </div>
        {/if}
      </div>
    {/if}

    <!-- 拖拽网格 -->
    <div class="vc-grid">
      <!-- 左栏 -->
      <div class="vc-col">
        {#each leftSlots as slot (slot.id)}
          <div
            class="vc-slot"
            class:drag-over={false}
            draggable={slot.key !== 'empty' && hasData(slot.key)}
            on:dragstart={(e) => onDragStart(e, slot.id)}
            on:dragover={(e) => onDragOver(e, slot.id)}
            on:drop={(e) => onDrop(e, slot.id)}
          >
            {#if slot.key === 'empty' || !hasData(slot.key)}
              <div class="vc-slot-empty">
                {#if slot.key === 'empty'}
                  <span class="vc-slot-hint">拖放模块到此处</span>
                {:else}
                  <span class="vc-slot-hint">暂无数据</span>
                {/if}
              </div>
            {:else if slot.key === 'stats'}
              <Section title="统计概览">
                {#if activeVaultId === null && activeStats.length > 1}
                  <div class="vc-summary-row">
                    <span class="vc-summary-item"><strong>{totalNotes}</strong><small>笔记</small></span>
                    <span class="vc-summary-item"><strong>{totalFolders}</strong><small>文件夹</small></span>
                    <span class="vc-summary-item"><strong>{tagCloud.slice(0,20).length}</strong><small>标签</small></span>
                    <span class="vc-summary-item"><strong class="vc-green">+{totalAdded}</strong><small>本周</small></span>
                  </div>
                {/if}
                {#each activeStats as stat}<VaultStatsCard {...stat} />{/each}
              </Section>
            {:else if slot.key === 'tasks'}
              <Section title="任务待办" badge={sectionBadge('tasks')}>
                <TaskSection tasks={activeTasks} {onOpenTask} {onToggleTask} />
              </Section>
            {:else if slot.key === 'recent'}
              <Section title="最近更新" badge={sectionBadge('recent')} defaultOpen={false}>
                <RecentChanges changes={activeChanges} {onOpenNote} />
              </Section>
            {:else if slot.key === 'health'}
              <Section title="库健康度" defaultOpen={false}>
                <HealthSection healthData={activeHealth} />
              </Section>
            {:else if slot.key === 'suggestions'}
              <Section title="建议" badge={sectionBadge('suggestions')} defaultOpen={false}>
                <SuggestionList suggestions={activeSuggestions} />
              </Section>
            {:else if slot.key === 'embed'}
              <Section title="嵌入引用" defaultOpen={false}>
                <EmbedRefSection embedData={activeEmbed} />
              </Section>
            {:else if slot.key === 'otherVaults'}
              <Section title="其他库概况" badge={sectionBadge('otherVaults')} defaultOpen={false}>
                {#each stats.filter(s => s.vaultId !== activeVaultId) as s}
                  <div class="vc-other-vault">
                    <span class="vc-other-name">{s.vaultName}</span>
                    <span class="vc-other-stat">{s.totalNotes} 笔记 · +{s.added7d} 本周</span>
                  </div>
                {/each}
              </Section>
            {/if}
          </div>
        {/each}
      </div>
      <!-- 右栏 -->
      <div class="vc-col">
        {#each rightSlots as slot (slot.id)}
          <div
            class="vc-slot"
            draggable={slot.key !== 'empty' && hasData(slot.key)}
            on:dragstart={(e) => onDragStart(e, slot.id)}
            on:dragover={(e) => onDragOver(e, slot.id)}
            on:drop={(e) => onDrop(e, slot.id)}
          >
            {#if slot.key === 'empty' || !hasData(slot.key)}
              <div class="vc-slot-empty">
                {#if slot.key === 'empty'}
                  <span class="vc-slot-hint">拖放模块到此处</span>
                {:else}
                  <span class="vc-slot-hint">暂无数据</span>
                {/if}
              </div>
            {:else if slot.key === 'stats'}
              <Section title="统计概览">
                {#each activeStats as stat}<VaultStatsCard {...stat} />{/each}
              </Section>
            {:else if slot.key === 'tasks'}
              <Section title="任务待办" badge={sectionBadge('tasks')}>
                <TaskSection tasks={activeTasks} {onOpenTask} {onToggleTask} />
              </Section>
            {:else if slot.key === 'recent'}
              <Section title="最近更新" badge={sectionBadge('recent')} defaultOpen={false}>
                <RecentChanges changes={activeChanges} {onOpenNote} />
              </Section>
            {:else if slot.key === 'health'}
              <Section title="库健康度" defaultOpen={false}>
                <HealthSection healthData={activeHealth} />
              </Section>
            {:else if slot.key === 'suggestions'}
              <Section title="建议" badge={sectionBadge('suggestions')} defaultOpen={false}>
                <SuggestionList suggestions={activeSuggestions} />
              </Section>
            {:else if slot.key === 'embed'}
              <Section title="嵌入引用" defaultOpen={false}>
                <EmbedRefSection embedData={activeEmbed} />
              </Section>
            {:else if slot.key === 'otherVaults'}
              <Section title="其他库概况" badge={sectionBadge('otherVaults')} defaultOpen={false}>
                {#each stats.filter(s => s.vaultId !== activeVaultId) as s}
                  <div class="vc-other-vault">
                    <span class="vc-other-name">{s.vaultName}</span>
                    <span class="vc-other-stat">{s.totalNotes} 笔记 · +{s.added7d} 本周</span>
                  </div>
                {/each}
              </Section>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <div class="vc-footer">
    <span>快照 {debugReport?.snapshotInfo.length ?? 0}/{debugReport?.vaultConfigs.length ?? 0}</span>
    {#if activeVaultId === null}<span>汇总视图</span>{:else}<span>已筛选</span>{/if}
    {#if debugReport && debugReport.errors.length > 0}
      <span class="vc-foot-err">{debugReport.errors.length} 错误</span>
    {/if}
    <button class="vc-foot-btn" on:click={onToggleDebug}>{debugEnabled ? '关闭调试' : '调试'}</button>
  </div>
  <DebugPanel report={debugReport} onClear={onClearDebugLogs} />
</div>

<style>
  .vc-dashboard {
    padding: 0; font-family: var(--font-interface); color: var(--text-normal);
    background: var(--background-primary); height: 100%; overflow-y: auto;
    display: flex; flex-direction: column;
  }
  /* Cards */
  .vc-cards-area { position: relative; padding: 8px 16px 14px; flex-shrink: 0; }
  .vc-card {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; width: 100px; height: 100px; padding: 8px 6px;
    background: var(--background-secondary); border: 1.5px solid var(--background-modifier-border);
    border-radius: 14px; cursor: pointer; position: absolute;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.35s ease, box-shadow 0.3s ease, border-color 0.2s;
    transform: rotate(var(--r, 0deg));
  }
  .vc-card:hover { border-color: var(--interactive-accent); box-shadow: 0 10px 24px rgba(0,0,0,0.15); z-index: 99 !important; }
  .vc-card.active { border-color: var(--interactive-accent); box-shadow: 0 12px 32px rgba(0,0,0,0.22); background: var(--background-primary); z-index: 100 !important; }
  .vc-card-icon { font-size: 16px; color: var(--interactive-accent); line-height: 1; }
  .vc-card-name { font-size: 12px; font-weight: 700; color: var(--text-normal); max-width: 84px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vc-card-num { font-size: 11px; font-weight: 600; color: var(--text-muted); }
  .vc-card-num small { font-size: 9px; font-weight: 400; color: var(--text-faint); }
  .vc-card-add { color: var(--color-green); }
  .vc-tags-inline { position: absolute; top: 6px; max-width: calc(100% - 260px); overflow: hidden; transition: right 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }
  /* Grid */
  .vc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; padding: 8px 14px 14px; flex: 1; align-content: start; }
  .vc-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .vc-slot { min-height: 40px; border-radius: 8px; transition: background 0.15s; }
  .vc-slot[draggable="true"]:hover { cursor: grab; }
  .vc-slot[draggable="true"]:active { cursor: grabbing; }
  .vc-slot-empty { display: flex; align-items: center; justify-content: center; min-height: 48px; border: 2px dashed var(--background-modifier-border); border-radius: 10px; }
  .vc-slot-hint { font-size: 11px; color: var(--text-faint); }
  /* Summary */
  .vc-summary-row { display: flex; gap: 24px; padding: 8px 0 4px; border-bottom: 1px solid var(--background-modifier-border-hover); margin-bottom: 4px; }
  .vc-summary-item { display: flex; align-items: baseline; gap: 3px; font-size: 14px; color: var(--text-muted); }
  .vc-summary-item strong { color: var(--text-normal); font-weight: 700; font-size: 18px; }
  .vc-summary-item small { font-size: 11px; color: var(--text-faint); }
  .vc-green { color: var(--color-green); }
  .vc-other-vault { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--background-modifier-border-hover); }
  .vc-other-vault:last-child { border-bottom: none; }
  .vc-other-name { font-size: 12px; font-weight: 500; color: var(--text-normal); }
  .vc-other-stat { font-size: 11px; color: var(--text-faint); }
  /* Misc */
  .vc-diagnostic { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: var(--background-modifier-error); color: var(--text-error); font-size: 11px; }
  .vc-btn-diag { padding: 2px 10px; font-size: 10px; background: var(--text-error); color: var(--background-primary); border: none; border-radius: 4px; cursor: pointer; }
  .vc-footer { display: flex; align-items: center; gap: 14px; padding: 6px 14px; border-top: 1px solid var(--background-modifier-border); font-size: 10px; color: var(--text-faint); flex-shrink: 0; }
  .vc-foot-err { color: var(--text-error); font-weight: 600; }
  .vc-foot-btn { margin-left: auto; padding: 2px 8px; background: none; border: 1px solid var(--background-modifier-border); border-radius: 4px; cursor: pointer; color: var(--text-faint); font-size: 10px; }
  .vc-foot-btn:hover { color: var(--text-normal); border-color: var(--text-muted); }
</style>
