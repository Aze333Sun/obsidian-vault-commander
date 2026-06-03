import { PluginSettingTab, Setting, Notice } from 'obsidian';
import type VaultCommanderPlugin from './main';
import { FileTypeFilter } from './utils/file-type-filter';

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface VaultPathStatus {
  status: 'ok' | 'warning' | 'error';
  message: string;
}

export class VaultCommanderSettingTab extends PluginSettingTab {
  private plugin: VaultCommanderPlugin;

  constructor(plugin: VaultCommanderPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  private makeSection(container: HTMLElement, title: string, open: boolean = false): HTMLElement {
    const details = container.createEl('details', { cls: 'vc-settings-section' });
    const summary = details.createEl('summary', { cls: 'vc-settings-summary' });
    summary.createEl('h2', { text: title });
    (details as HTMLDetailsElement).open = open;
    const body = details.createEl('div', { cls: 'vc-settings-body' });
    return body;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: '控制台' });

    // Add custom styles for settings
    const style = containerEl.createEl('style');
    style.textContent = `
      .vc-settings-section {
        margin-bottom: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        overflow: hidden;
      }
      .vc-settings-section[open] {
        border-color: var(--interactive-accent);
      }
      .vc-settings-summary {
        padding: 10px 16px;
        cursor: pointer;
        user-select: none;
        background: var(--background-secondary);
        transition: background 0.15s;
      }
      .vc-settings-summary:hover {
        background: var(--background-modifier-hover);
      }
      .vc-settings-summary h2 {
        display: inline;
        margin: 0;
        font-size: 14px;
        font-weight: 600;
        color: var(--text-normal);
      }
      .vc-settings-summary::marker {
        color: var(--text-muted);
        font-size: 12px;
      }
      .vc-settings-section[open] .vc-settings-summary {
        border-bottom: 1px solid var(--background-modifier-border);
      }
      .vc-settings-body {
        padding: 8px 16px 12px;
      }
    `;

    this.buildVaultListSection(this.makeSection(containerEl, '分库管理', true));
    this.buildTemplateSection(this.makeSection(containerEl, '模板管理'));
    this.buildScanSettingsSection(this.makeSection(containerEl, '扫描设置'));
    this.buildFileTypeSection(this.makeSection(containerEl, '文件类型'));
    this.buildIgnoreSection(this.makeSection(containerEl, '忽略设置'));
    this.buildDisplaySection(this.makeSection(containerEl, '显示与模块', true));
  }

  // ─── 分库管理 ─────────────────────────────────────

  private buildVaultListSection(container: HTMLElement): void {
    container.createEl('h3', { text: '已配置分库' });

    const vaults = this.plugin.settings.vaults;

    for (const vault of vaults) {
      const status = this.validateVaultPath(vault.path);
      const vaultSection = new Setting(container)
        .setName(vault.name)
        .setDesc(`${vault.path}`)
        .addToggle((toggle) =>
          toggle.setValue(vault.isEnabled).onChange(async (value) => {
            vault.isEnabled = value;
            await this.plugin.saveSettings();
            this.plugin.eventBus.emit('vault:updated', { config: vault });
          }),
        )
        .addButton((btn) =>
          btn
            .setButtonText('移除')
            .setWarning()
            .onClick(async () => {
              const idx = this.plugin.settings.vaults.findIndex((v) => v.id === vault.id);
              if (idx > -1) {
                this.plugin.settings.vaults.splice(idx, 1);
                await this.plugin.cache.removeVault(vault.id);
                await this.plugin.saveSettings();
                this.plugin.eventBus.emit('vault:removed', { vaultId: vault.id });
                this.display();
              }
            }),
        );

      // 路径状态指示
      const statusEl = vaultSection.controlEl.createSpan({
        cls: `vc-status-indicator vc-status-${status.status}`,
        text: status.message,
      });
      statusEl.style.marginLeft = '8px';
      statusEl.style.fontSize = 'var(--font-smallest)';
    }

    if (vaults.length === 0) {
      container.createEl('p', {
        text: '尚未添加任何分库，请在下方输入路径添加第一个分库。',
        cls: 'vc-empty-hint',
      });
    }

    // 添加新分库区域
    const addSection = container.createDiv({ cls: 'vc-add-vault-section' });
    addSection.createEl('h3', { text: '添加新分库' });

    let pendingPath = '';
    let pendingName = '';

    new Setting(addSection)
      .setName('库文件夹路径')
      .setDesc('输入 Obsidian vault 的完整路径')
      .addText((text) => {
        text.setPlaceholder('D:/Obsidian/MyVault').onChange(async (value) => {
          pendingPath = value.trim();
          // 自动提取文件夹名为默认名称
          if (!pendingName && pendingPath) {
            const parts = pendingPath.replace(/\\/g, '/').split('/');
            const last = parts[parts.length - 1];
            if (last && last !== '.') {
              pendingName = last;
            }
          }
        });
        return text;
      });

    new Setting(addSection)
      .setName('显示名称（可选）')
      .setDesc('留空则自动使用文件夹名')
      .addText((text) =>
        text.setPlaceholder('自动检测').onChange((value) => {
          pendingName = value.trim();
        }),
      );

    // 实时路径验证反馈
    addSection.createDiv({ cls: 'vc-validation-result' });

    new Setting(addSection).addButton((btn) =>
      btn
        .setButtonText('添加分库')
        .setCta()
        .onClick(async () => {
          if (!pendingPath) {
            new Notice('请输入库文件夹路径');
            return;
          }

          const normalized = pendingPath.replace(/\\/g, '/');
          const status = this.validateVaultPath(normalized);

          if (status.status === 'error') {
            new Notice(`无法添加: ${status.message}`);
            return;
          }

          const name = pendingName || normalized.split('/').pop() || '未命名库';

          // 检查是否重复
          const exists = this.plugin.settings.vaults.some(
            (v) => v.path.replace(/\\/g, '/') === normalized,
          );
          if (exists) {
            new Notice('该路径已在分库列表中');
            return;
          }

          this.plugin.settings.vaults.push({
            id: generateId(),
            name,
            path: normalized,
            addedAt: Date.now(),
            isEnabled: true,
            ignorePatterns: [],
          });

          await this.plugin.saveSettings();
          this.plugin.eventBus.emit('vault:added', {
            config: this.plugin.settings.vaults[this.plugin.settings.vaults.length - 1],
          });
          new Notice(`已添加分库: ${name}`);
          this.display();
        }),
    );
  }

  // ─── 模板管理 ─────────────────────────────────────

  private buildTemplateSection(container: HTMLElement): void {
    container.createEl('h3', { text: '内置模板' });
    container.createEl('p', { text: '新建分发时可选择这些模板。支持 {{title}} 和 {{date}} 占位符。', cls: 'setting-item-description' });

    const templates = this.plugin.settings.templates.customTemplates;

    const renderTemplates = () => {
      // Clear existing template settings
      const old = container.querySelectorAll('.vc-template-item');
      old.forEach((e) => e.remove());

      templates.forEach((tpl, idx) => {
        const div = container.createEl('div', { cls: 'vc-template-item' });
        div.style.cssText = 'margin-bottom:12px;padding:8px;border:1px solid var(--background-modifier-border);border-radius:6px;';

        new Setting(div)
          .setName(`模板 ${idx + 1}`)
          .addText((text) =>
            text.setValue(tpl.name).onChange((v) => { tpl.name = v; this.plugin.saveSettings(); }),
          );

        const textarea = div.createEl('textarea');
        textarea.style.cssText = 'width:100%;height:80px;font-family:var(--font-monospace);font-size:11px;margin-top:4px;';
        textarea.value = tpl.content;
        textarea.oninput = () => { tpl.content = textarea.value; this.plugin.saveSettings(); };

        new Setting(div)
          .addButton((btn) =>
            btn.setButtonText('删除').onClick(async () => {
              templates.splice(idx, 1);
              await this.plugin.saveSettings();
              this.display();
            }),
          );
      });
    };

    renderTemplates();

    new Setting(container)
      .setName('添加模板')
      .setDesc('创建新的自定义模板')
      .addButton((btn) =>
        btn.setButtonText('添加').onClick(async () => {
          templates.push({ name: '新模板', content: '---\ncreated: {{date}}\n---\n\n# {{title}}\n\n' });
          await this.plugin.saveSettings();
          this.display();
        }),
      );
  }

  // ─── 扫描设置 ─────────────────────────────────────

  private buildScanSettingsSection(container: HTMLElement): void {
    container.createEl('h3', { text: '扫描频率与大小' });

    new Setting(container)
      .setName('扫描频率')
      .setDesc('设置自动扫描的时间间隔')
      .addDropdown((dropdown) => {
        dropdown
          .addOption('realtime', '实时')
          .addOption('30s', '30 秒')
          .addOption('60s', '1 分钟')
          .addOption('5min', '5 分钟')
          .addOption('manual', '手动')
          .setValue(this.plugin.settings.scan.frequency)
          .onChange(async (value: string) => {
            this.plugin.settings.scan.frequency = value as
              | 'realtime'
              | '30s'
              | '60s'
              | '5min'
              | 'manual';
            await this.plugin.saveSettings();
          });
      });

    new Setting(container)
      .setName('增量扫描')
      .setDesc('仅扫描自上次扫描以来有变化的文件（推荐）')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.scan.incrementalOnly).onChange(async (value) => {
          this.plugin.settings.scan.incrementalOnly = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(container)
      .setName('最大文件大小')
      .setDesc('超过此大小的文件不进行全文索引（默认 10MB = 10485760 字节）')
      .addText((text) =>
        text
          .setPlaceholder('10485760')
          .setValue(String(this.plugin.settings.scan.maxFileSize))
          .onChange(async (value) => {
            const num = Number(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.scan.maxFileSize = num;
              await this.plugin.saveSettings();
            }
          }),
      );

    new Setting(container)
      .setName('窗口切换时自动扫描')
      .setDesc('当 Obsidian 窗口获得焦点时自动执行增量扫描')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.scan.autoScanOnFocus).onChange(async (value) => {
          this.plugin.settings.scan.autoScanOnFocus = value;
          await this.plugin.saveSettings();
        }),
      );
  }

  // ─── 文件类型管理 ──────────────────────────────────

  private buildFileTypeSection(container: HTMLElement): void {
    container.createEl('h3', { text: '允许的扩展名' });
    container.createEl('p', {
      text: '插件只处理这些类型的文件，其他文件（图片、PDF、音频等）完全跳过。',
      cls: 'setting-item-description',
    });

    const enabledTypes = this.plugin.settings.scan.fileTypes.enabled;

    // 已启用的类型标签
    const tagsContainer = container.createDiv({ cls: 'vc-file-types' });
    if (enabledTypes.length === 0) {
      tagsContainer.createEl('span', {
        text: '（仅默认扫描 .md 文件）',
        cls: 'vc-muted',
      });
    } else {
      for (const ext of enabledTypes) {
        const tagEl = tagsContainer.createSpan({ cls: 'vc-file-type-tag' });
        tagEl.createSpan({ text: ext });
        const removeBtn = tagEl.createSpan({ cls: 'vc-file-type-remove', text: ' ×' });
        removeBtn.style.cursor = 'pointer';
        removeBtn.onclick = async () => {
          const idx = this.plugin.settings.scan.fileTypes.enabled.indexOf(ext);
          if (idx > -1) {
            this.plugin.settings.scan.fileTypes.enabled.splice(idx, 1);
            await this.plugin.saveSettings();
            this.display();
          }
        };
      }
    }

    // 添加新类型
    let pendingExt = '';

    new Setting(container)
      .setName('添加文件类型')
      .setDesc('输入扩展名（如 .txt, .org, .markdown），仅支持文本类型')
      .addText((text) => {
        text.setPlaceholder('.txt').onChange((val) => {
          pendingExt = val.trim();
        });
        return text;
      })
      .addButton((btn) =>
        btn.setButtonText('添加').onClick(async () => {
          if (!pendingExt) {
            new Notice('请输入扩展名');
            return;
          }

          const normalized = FileTypeFilter.normalizeExtension(pendingExt);
          const validation = FileTypeFilter.isValidForScan(normalized);

          if (!validation.valid) {
            new Notice(validation.reason || '无效的扩展名');
            return;
          }

          if (this.plugin.settings.scan.fileTypes.enabled.includes(normalized)) {
            new Notice('该扩展名已存在');
            return;
          }

          this.plugin.settings.scan.fileTypes.enabled.push(normalized);
          await this.plugin.saveSettings();
          this.display();
        }),
      );

    // 重置按钮
    new Setting(container).addButton((btn) =>
      btn
        .setButtonText('重置为默认（仅 .md）')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.scan.fileTypes.enabled = ['.md'];
          await this.plugin.saveSettings();
          this.display();
        }),
    );
  }

  // ─── 忽略规则 ─────────────────────────────────────

  private buildIgnoreSection(container: HTMLElement): void {
    container.createEl('h3', { text: '忽略模式' });
    container.createEl('p', {
      text: '匹配这些模式的文件夹和文件将在扫描时跳过。支持 glob 通配符（如 *.exe）。',
      cls: 'setting-item-description',
    });

    new Setting(container)
      .setName('忽略以 . 开头的文件和文件夹')
      .setDesc('如 .git、.obsidian、.DS_Store 等隐藏文件')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.ignore.ignoreDotFiles).onChange(async (value) => {
          this.plugin.settings.ignore.ignoreDotFiles = value;
          await this.plugin.saveSettings();
        }),
      );

    // 已有忽略模式
    const patterns = this.plugin.settings.ignore.patterns;
    for (let i = 0; i < patterns.length; i++) {
      const idx = i;
      new Setting(container)
        .setName(idx === 0 ? '忽略模式' : '')
        .addText((text) =>
          text.setValue(patterns[idx]).onChange(async (value) => {
            patterns[idx] = value.trim();
            await this.plugin.saveSettings();
          }),
        )
        .addButton((btn) =>
          btn.setButtonText('移除').onClick(async () => {
            patterns.splice(idx, 1);
            await this.plugin.saveSettings();
            this.display();
          }),
        );
    }

    // 添加新模式
    let pendingPattern = '';

    new Setting(container)
      .setName(patterns.length > 0 ? '' : '忽略模式')
      .addText((text) =>
        text.setPlaceholder('.trash, _draft, *.log').onChange((val) => {
          pendingPattern = val.trim();
        }),
      )
      .addButton((btn) =>
        btn.setButtonText('添加模式').onClick(async () => {
          if (!pendingPattern) {
            new Notice('请输入忽略模式');
            return;
          }
          if (patterns.includes(pendingPattern)) {
            new Notice('该模式已存在');
            return;
          }
          patterns.push(pendingPattern);
          await this.plugin.saveSettings();
          this.display();
        }),
      );

    // 重置为默认
    new Setting(container).addButton((btn) =>
      btn
        .setButtonText('重置为默认忽略规则')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.ignore.patterns = [
            '.git',
            'node_modules',
            '.obsidian',
            '_attachments',
            '*.exe',
          ];
          this.plugin.settings.ignore.ignoreDotFiles = true;
          await this.plugin.saveSettings();
          this.display();
        }),
    );
  }

  // ─── 显示设置 ─────────────────────────────────────

  private buildDisplaySection(container: HTMLElement): void {
    container.createEl('h3', { text: '显示选项' });

    new Setting(container)
      .setName('最近更新最大条数')
      .setDesc('仪表盘中展示的最近更新笔记数量上限')
      .addSlider((slider) =>
        slider
          .setLimits(5, 100, 5)
          .setValue(this.plugin.settings.ui.maxRecentItems)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.ui.maxRecentItems = value;
            await this.plugin.saveSettings();
          }),
      );

    // 调试模式
    new Setting(container)
      .setName('调试模式')
      .setDesc('在仪表盘底部显示调试面板，包含事件日志、扫描状态、错误信息等')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.ui.debug).onChange(async (value) => {
          this.plugin.settings.ui.debug = value;
          await this.plugin.saveSettings();
          if (value) {
            this.plugin.debugLogger.enabled = true;
            this.plugin.debugLogger.captureConsole();
          } else {
            this.plugin.debugLogger.enabled = false;
            this.plugin.debugLogger.releaseConsole();
          }
        }),
      );

    // 模块开关
    container.createEl('h3', { text: '模块开关' });
    container.createEl('p', { text: '关闭的模块不会在仪表盘中显示。', cls: 'setting-item-description' });

    const modNames: Record<string, string> = {
      stats: '统计概览', tasks: '任务待办', recent: '最近更新', weekly: '活跃动态',
      health: '库健康度', suggestions: '建议', embed: '嵌入引用', otherVaults: '其他库概况', orphans: '无链接笔记',
    };
    for (const [key, name] of Object.entries(modNames)) {
      new Setting(container)
        .setName(name)
        .addToggle((toggle) =>
          toggle.setValue(!!this.plugin.settings.ui.modules[key as keyof typeof this.plugin.settings.ui.modules]).onChange(async (value) => {
            (this.plugin.settings.ui.modules as Record<string, boolean>)[key] = value;
            await this.plugin.saveSettings();
          }),
        );
    }

    // 搜索历史管理
    const historyCount = this.plugin.settings.ui.searchHistory.length;
    new Setting(container)
      .setName('搜索历史')
      .setDesc(historyCount > 0 ? `已保存 ${historyCount} 条搜索记录` : '暂无搜索历史')
      .addButton((btn) =>
        btn
          .setButtonText('清空搜索历史')
          .setDisabled(historyCount === 0)
          .onClick(async () => {
            this.plugin.settings.ui.searchHistory = [];
            await this.plugin.saveSettings();
            this.display();
          }),
      );
  }

  // ─── 路径验证 ─────────────────────────────────────

  private validateVaultPath(path: string): VaultPathStatus {
    if (!path || path.trim() === '') {
      return { status: 'error', message: '路径为空' };
    }

    const fs = require('fs');
    const pathModule = require('path');

    if (!fs.existsSync(path)) {
      return { status: 'error', message: '路径不存在' };
    }

    const stat = fs.statSync(path);
    if (!stat.isDirectory()) {
      return { status: 'error', message: '路径不是文件夹' };
    }

    if (!fs.existsSync(pathModule.join(path, '.obsidian'))) {
      return { status: 'warning', message: '未检测到 .obsidian 文件夹' };
    }

    try {
      fs.accessSync(path, fs.constants.R_OK);
    } catch {
      return { status: 'error', message: '无读取权限' };
    }

    return { status: 'ok', message: '正常' };
  }
}
