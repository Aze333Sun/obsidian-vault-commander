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

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h1', { text: 'Vault Commander' });

    this.buildVaultListSection(containerEl);
    this.buildScanSettingsSection(containerEl);
    this.buildFileTypeSection(containerEl);
    this.buildIgnoreSection(containerEl);
    this.buildDisplaySection(containerEl);
  }

  // ─── 分库管理 ─────────────────────────────────────

  private buildVaultListSection(container: HTMLElement): void {
    container.createEl('h2', { text: '分库管理' });

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

  // ─── 扫描设置 ─────────────────────────────────────

  private buildScanSettingsSection(container: HTMLElement): void {
    container.createEl('h2', { text: '扫描设置' });

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
    container.createEl('h2', { text: '扫描文件类型' });
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
    container.createEl('h2', { text: '忽略规则' });
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
    container.createEl('h2', { text: '显示设置' });

    new Setting(container)
      .setName('显示标签云')
      .setDesc('在仪表盘中展示跨库标签云')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.ui.showTagCloud).onChange(async (value) => {
          this.plugin.settings.ui.showTagCloud = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(container)
      .setName('显示健康度评分')
      .setDesc('在仪表盘中展示知识库健康度分析')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.ui.showHealthScore).onChange(async (value) => {
          this.plugin.settings.ui.showHealthScore = value;
          await this.plugin.saveSettings();
        }),
      );

    new Setting(container)
      .setName('显示嵌入引用概览')
      .setDesc('在仪表盘中展示图片/音频/视频嵌入统计')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.ui.showEmbedRef).onChange(async (value) => {
          this.plugin.settings.ui.showEmbedRef = value;
          await this.plugin.saveSettings();
        }),
      );

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

    new Setting(container)
      .setName('紧凑模式')
      .setDesc('使用更紧凑的布局减少视觉间距')
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.ui.compactMode).onChange(async (value) => {
          this.plugin.settings.ui.compactMode = value;
          await this.plugin.saveSettings();
        }),
      );

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
