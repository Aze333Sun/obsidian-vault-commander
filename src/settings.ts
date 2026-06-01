import { PluginSettingTab, Setting } from 'obsidian';
import type VaultCommanderPlugin from './main';

export class VaultCommanderSettingTab extends PluginSettingTab {
  private plugin: VaultCommanderPlugin;

  constructor(plugin: VaultCommanderPlugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.buildVaultListSection(containerEl);
    this.buildScanSettingsSection(containerEl);
    this.buildFileTypeSection(containerEl);
    this.buildIgnoreSection(containerEl);
    this.buildDisplaySection(containerEl);
  }

  private buildVaultListSection(container: HTMLElement): void {
    container.createEl('h2', { text: '分库管理' });

    for (const vault of this.plugin.settings.vaults) {
      const status = this.validateVaultPath(vault.path);
      const vaultDiv = container.createDiv({ cls: 'setting-item' });
      vaultDiv.createEl('span', {
        text: `${vault.name} (${status.message})`,
        cls: `vc-vault-status vc-status-${status.status}`,
      });
    }

    new Setting(container)
      .setName('添加分库')
      .setDesc('输入 Obsidian 库的文件夹路径')
      .addText(text =>
        text.setPlaceholder('D:/Obsidian/MyVault').onChange(async (_value) => {
          // path validation
        })
      )
      .addButton(btn =>
        btn.setButtonText('添加').onClick(async () => {
          // add vault
        })
      );

    if (this.plugin.settings.vaults.length === 0) {
      container.createEl('p', {
        text: '尚未添加任何分库，请使用上方按钮添加第一个分库。',
        cls: 'vc-empty-hint',
      });
    }
  }

  private buildScanSettingsSection(container: HTMLElement): void {
    container.createEl('h2', { text: '扫描设置' });

    new Setting(container)
      .setName('扫描频率')
      .setDesc('设置自动扫描的时间间隔')
      .addDropdown(dropdown => {
        dropdown
          .addOption('realtime', '实时')
          .addOption('30s', '30 秒')
          .addOption('60s', '1 分钟')
          .addOption('5min', '5 分钟')
          .addOption('manual', '手动')
          .setValue(this.plugin.settings.scan.frequency)
          .onChange(async (value: string) => {
            this.plugin.settings.scan.frequency = value as 'realtime' | '30s' | '60s' | '5min' | 'manual';
            await this.plugin.saveSettings();
          });
      });

    new Setting(container)
      .setName('最大文件大小')
      .setDesc('超过此大小的文件不进行全文索引（默认 10MB）')
      .addText(text =>
        text
          .setPlaceholder('10485760')
          .setValue(String(this.plugin.settings.scan.maxFileSize))
          .onChange(async (value) => {
            const num = Number(value);
            if (!isNaN(num) && num > 0) {
              this.plugin.settings.scan.maxFileSize = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(container)
      .setName('窗口切换时自动扫描')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.scan.autoScanOnFocus)
          .onChange(async (value) => {
            this.plugin.settings.scan.autoScanOnFocus = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private buildFileTypeSection(container: HTMLElement): void {
    container.createEl('h2', { text: '扫描文件类型' });
    container.createEl('p', {
      text: '插件只处理以下文件类型，其他文件（图片、PDF、音频等）完全跳过。',
      cls: 'setting-item-description',
    });

    const enabledTypes = this.plugin.settings.scan.fileTypes.enabled;

    const typeListEl = container.createDiv({ cls: 'vc-file-types' });
    for (const ext of enabledTypes) {
      typeListEl.createEl('span', { text: ext, cls: 'vc-badge' });
    }

    new Setting(container)
      .setName('添加文件类型')
      .addText(text =>
        text.setPlaceholder('.txt').onChange((_val) => {
          // validate extension
        })
      )
      .addButton(btn =>
        btn.setButtonText('添加').onClick(async () => {
          // add file type
        })
      );

    new Setting(container).addButton(btn =>
      btn
        .setButtonText('重置为默认（仅 .md）')
        .setWarning()
        .onClick(async () => {
          this.plugin.settings.scan.fileTypes.enabled = ['.md'];
          await this.plugin.saveSettings();
          this.display();
        })
    );
  }

  private buildIgnoreSection(container: HTMLElement): void {
    container.createEl('h2', { text: '忽略规则' });

    new Setting(container)
      .setName('忽略 . 开头的文件')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.ignore.ignoreDotFiles)
          .onChange(async (value) => {
            this.plugin.settings.ignore.ignoreDotFiles = value;
            await this.plugin.saveSettings();
          })
      );

    this.plugin.settings.ignore.patterns.forEach((pattern, index) => {
      new Setting(container)
        .setName(`模式 ${index + 1}`)
        .addText(text =>
          text.setValue(pattern).onChange(async (value) => {
            this.plugin.settings.ignore.patterns[index] = value;
            await this.plugin.saveSettings();
          })
        )
        .addButton(btn =>
          btn.setButtonText('移除').onClick(async () => {
            this.plugin.settings.ignore.patterns.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          })
        );
    });
  }

  private buildDisplaySection(container: HTMLElement): void {
    container.createEl('h2', { text: '显示设置' });

    new Setting(container)
      .setName('显示标签云')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.ui.showTagCloud)
          .onChange(async (value) => {
            this.plugin.settings.ui.showTagCloud = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(container)
      .setName('显示健康度评分')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.ui.showHealthScore)
          .onChange(async (value) => {
            this.plugin.settings.ui.showHealthScore = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(container)
      .setName('最近更新最大条数')
      .addSlider(slider =>
        slider
          .setLimits(5, 100, 5)
          .setValue(this.plugin.settings.ui.maxRecentItems)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.ui.maxRecentItems = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(container)
      .setName('紧凑模式')
      .addToggle(toggle =>
        toggle
          .setValue(this.plugin.settings.ui.compactMode)
          .onChange(async (value) => {
            this.plugin.settings.ui.compactMode = value;
            await this.plugin.saveSettings();
          })
      );
  }

  private validateVaultPath(path: string): { status: 'ok' | 'warning' | 'error'; message: string } {
    const fs = require('fs');
    const pathModule = require('path');

    if (!fs.existsSync(path)) return { status: 'error', message: '路径不存在' };
    if (!fs.existsSync(pathModule.join(path, '.obsidian'))) {
      return { status: 'warning', message: '未检测到 .obsidian 配置' };
    }
    try {
      fs.accessSync(path, fs.constants.R_OK);
    } catch {
      return { status: 'error', message: '无法读取（权限不足）' };
    }
    return { status: 'ok', message: '正常' };
  }
}
