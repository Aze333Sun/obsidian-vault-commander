<script lang="ts">
  import TopBar from './components/TopBar.svelte';
  import QuickLaunch from './components/QuickLaunch.svelte';
  import VaultStatsCard from './components/VaultStatsCard.svelte';
  import RecentChanges from './components/RecentChanges.svelte';
  import TagCloud from './components/TagCloud.svelte';
  import HealthSection from './components/HealthSection.svelte';
  import LoadingSpinner from './shared/LoadingSpinner.svelte';
  import EmptyState from './shared/EmptyState.svelte';
  import ErrorBanner from './shared/ErrorBanner.svelte';

  export let scanning: boolean = false;
  export let error: string | null = null;

  export let vaults: Array<{
    id: string;
    name: string;
    path: string;
    totalNotes: number;
  }> = [];

  export let stats: Array<{
    vaultId: string;
    vaultName: string;
    totalNotes: number;
    totalFolders: number;
    tagCount: number;
    added24h: number;
    added7d: number;
  }> = [];

  export let recentChanges: Array<{
    vaultId: string;
    fileName: string;
    title: string;
    mtime: number;
    folder: string;
    tags: string[];
    isNew: boolean;
  }> = [];

  export let tagCloud: Array<{ tag: string; count: number }> = [];

  export let healthData: Array<{
    vaultId: string;
    vaultName: string;
    overall: number;
    dimensions: {
      activity: number;
      linkIntegrity: number;
      structure: number;
      updateFrequency: number;
    };
  }> = [];

  export let onRefresh: () => void = () => {};
  export let onOpenNote: (vaultId: string, filePath: string) => void = () => {};
  export let onOpenVault: (vaultId: string) => void = () => {};
  export let onSearch: (query: string) => void = () => {};
  export let onTagClick: (tag: string) => void = () => {};
</script>

<div class="vc-dashboard">
  <TopBar
    onRefresh={onRefresh}
    onSearch={onSearch}
    {scanning}
  />

  {#if error}
    <ErrorBanner message={error} onRetry={onRefresh} />
  {/if}

  {#if scanning}
    <LoadingSpinner message="正在扫描..." />
  {:else if vaults.length === 0}
    <EmptyState
      title="欢迎使用 Vault Commander"
      description="请先在设置中添加你的分库路径，即可开始管理所有 Obsidian 知识库。"
    />
  {:else}
    <div class="vc-dashboard-content">
      <QuickLaunch {vaults} {onOpenVault} />

      {#if stats.length > 0}
        <div class="vc-section">
          <h3 class="vc-section-title">统计概览</h3>
          {#each stats as stat}
            <VaultStatsCard {...stat} />
          {/each}
        </div>
      {/if}

      <RecentChanges changes={recentChanges} {onOpenNote} />

      {#if tagCloud.length > 0}
        <TagCloud tags={tagCloud} {onTagClick} />
      {/if}

      {#if healthData.length > 0}
        <HealthSection {healthData} />
      {/if}
    </div>
  {/if}
</div>

<style>
  .vc-dashboard {
    padding: 0;
    font-family: var(--font-interface);
    color: var(--text-normal);
    background: var(--background-primary);
    height: 100%;
    overflow-y: auto;
  }
  .vc-dashboard-content {
    padding: var(--size-4-3);
  }
  .vc-section {
    margin-bottom: var(--size-4-3);
  }
  .vc-section-title {
    font-size: var(--font-ui-small);
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 var(--size-4-1);
  }
</style>
