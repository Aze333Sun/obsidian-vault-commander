<script lang="ts">
  export let added24h = 0;
  export let added7d = 0;
  export let added30d = 0;
  export let modified24h = 0;
  export let modified7d = 0;
  export let modified30d = 0;

  const maxVal = 10;
</script>

<div class="vc-weekly">
  <div class="vc-weekly-section">
    <span class="vc-weekly-label">新增笔记</span>
    <div class="vc-weekly-bars">
      <div class="vc-weekly-bar-row">
        <span class="vc-weekly-period">24h</span>
        <div class="vc-weekly-track">
          <div class="vc-weekly-fill vc-fill-add" style="width:{Math.min(100, (added24h/maxVal)*100)}%"></div>
        </div>
        <span class="vc-weekly-num">{added24h}</span>
      </div>
      <div class="vc-weekly-bar-row">
        <span class="vc-weekly-period">7d</span>
        <div class="vc-weekly-track">
          <div class="vc-weekly-fill vc-fill-add" style="width:{Math.min(100, (added7d/maxVal)*100)}%"></div>
        </div>
        <span class="vc-weekly-num">{added7d}</span>
      </div>
      <div class="vc-weekly-bar-row">
        <span class="vc-weekly-period">30d</span>
        <div class="vc-weekly-track">
          <div class="vc-weekly-fill vc-fill-add" style="width:{Math.min(100, (added30d/maxVal)*100)}%"></div>
        </div>
        <span class="vc-weekly-num">{added30d}</span>
      </div>
    </div>
  </div>
  <div class="vc-weekly-section">
    <span class="vc-weekly-label">修改笔记</span>
    <div class="vc-weekly-bars">
      <div class="vc-weekly-bar-row">
        <span class="vc-weekly-period">24h</span>
        <div class="vc-weekly-track">
          <div class="vc-weekly-fill vc-fill-mod" style="width:{Math.min(100, (modified24h/maxVal)*100)}%"></div>
        </div>
        <span class="vc-weekly-num">{modified24h}</span>
      </div>
      <div class="vc-weekly-bar-row">
        <span class="vc-weekly-period">7d</span>
        <div class="vc-weekly-track">
          <div class="vc-weekly-fill vc-fill-mod" style="width:{Math.min(100, (modified7d/maxVal)*100)}%"></div>
        </div>
        <span class="vc-weekly-num">{modified7d}</span>
      </div>
      <div class="vc-weekly-bar-row">
        <span class="vc-weekly-period">30d</span>
        <div class="vc-weekly-track">
          <div class="vc-weekly-fill vc-fill-mod" style="width:{Math.min(100, (modified30d/maxVal)*100)}%"></div>
        </div>
        <span class="vc-weekly-num">{modified30d}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .vc-weekly { display: flex; flex-direction: column; gap: 10px; }
  .vc-weekly-section { display: flex; flex-direction: column; gap: 4px; }
  .vc-weekly-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
  .vc-weekly-bars { display: flex; flex-direction: column; gap: 3px; }
  .vc-weekly-bar-row { display: flex; align-items: center; gap: 6px; }
  .vc-weekly-period { font-size: 10px; color: var(--text-faint); width: 24px; text-align: right; flex-shrink: 0; }
  .vc-weekly-track { flex: 1; height: 8px; background: var(--background-modifier-border); border-radius: 4px; overflow: hidden; }
  .vc-weekly-fill { height: 100%; border-radius: 4px; transition: width 0.6s ease; }
  .vc-fill-add { background: var(--color-green); }
  .vc-fill-mod { background: var(--interactive-accent); }
  .vc-weekly-num { font-size: 11px; font-weight: 600; color: var(--text-normal); width: 24px; flex-shrink: 0; }
</style>
