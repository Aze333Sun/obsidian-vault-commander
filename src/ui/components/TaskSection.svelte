<script lang="ts">
  import type { TaskItem } from '../../types/snapshot';

  export let tasks: TaskItem[] = [];
  export let onOpenTask: (vaultId: string, fileName: string, line: number) => void = () => {};
  export let onToggleTask: (task: TaskItem) => void = () => {};

  let filter: 'all' | 'open' | 'done' = 'open';

  $: filtered = tasks
    .filter((t) => {
      if (filter === 'open') return !t.done;
      if (filter === 'done') return t.done;
      return true;
    })
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return b.priority - a.priority;
    });

  $: openCount = tasks.filter((t) => !t.done).length;
  $: doneCount = tasks.filter((t) => t.done).length;

  function prio(color: string): string {
    return `<span style="color:${color}">●</span>`;
  }

  function fmtDue(d: string | null): string {
    if (!d) return '';
    const due = new Date(d);
    const diff = due.getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return `过期`;
    if (days === 0) return '今天';
    if (days === 1) return '明天';
    if (days <= 7) return `${days}天后`;
    return d;
  }
</script>

<div class="vc-tasks">
  <div class="vc-tasks-tabs">
    <button class="vc-tab" class:active={filter === 'open'} on:click={() => (filter = 'open')}>待办 {openCount}</button>
    <button class="vc-tab" class:active={filter === 'done'} on:click={() => (filter = 'done')}>已完成 {doneCount}</button>
    <button class="vc-tab" class:active={filter === 'all'} on:click={() => (filter = 'all')}>全部 {tasks.length}</button>
  </div>
  <div class="vc-tasks-list">
    {#each filtered as task (task.id)}
      <div class="vc-task" class:done={task.done}>
        <button class="vc-task-check" on:click={() => onToggleTask(task)}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/>{#if task.done}<path d="M8 12l3 3 5-5"/>{/if}</svg>
        </button>
        <button class="vc-task-body" on:click={() => onOpenTask(task.vaultId, task.fileName, task.line)}>
          <span class="vc-task-title">
            {#if task.priority >= 3}<span class="vc-prio vc-prio-3">●</span>{/if}
            {task.title}
          </span>
          <span class="vc-task-meta">
            {task.vaultName}
            {#if task.dueDate}<span class="vc-due" class:overdue={fmtDue(task.dueDate) === '过期'}>{fmtDue(task.dueDate)}</span>{/if}
          </span>
        </button>
      </div>
    {/each}
  </div>
</div>

<style>
  .vc-tasks-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 10px;
  }
  .vc-tab {
    padding: 4px 12px;
    background: none;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    transition: background 0.15s, color 0.15s;
  }
  .vc-tab:hover { background: var(--background-modifier-hover); color: var(--text-normal); }
  .vc-tab.active { background: var(--interactive-accent); color: #fff; }
  .vc-tasks-list {
    display: flex;
    flex-direction: column;
  }
  .vc-task {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 8px 6px;
    border-radius: 6px;
    transition: background 0.1s;
  }
  .vc-task:hover { background: var(--background-modifier-hover); }
  .vc-task-check {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    margin-top: 1px;
  }
  .vc-task-check:hover { color: var(--interactive-accent); }
  .vc-task.done .vc-task-check { color: var(--color-green); }
  .vc-task-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    padding: 0;
  }
  .vc-task-title {
    font-size: 13px;
    color: var(--text-normal);
    line-height: 1.4;
  }
  .vc-task.done .vc-task-title {
    text-decoration: line-through;
    color: var(--text-faint);
  }
  .vc-task-meta {
    font-size: 11px;
    color: var(--text-faint);
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .vc-prio { font-size: 10px; }
  .vc-prio-3 { color: var(--text-error); }
  .vc-due {
    padding: 0 5px;
    border-radius: 3px;
    font-size: 10px;
    background: var(--background-modifier-border);
  }
  .vc-due.overdue {
    background: var(--background-modifier-error);
    color: var(--text-error);
  }
</style>
