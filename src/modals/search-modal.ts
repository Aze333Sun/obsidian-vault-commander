import { Modal } from 'obsidian';

export class SearchModal extends Modal {
  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '跨库搜索' });
    contentEl.createEl('p', { text: '搜索功能将在 Phase 2 实现' });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
