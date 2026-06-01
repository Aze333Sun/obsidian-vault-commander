import { Modal } from 'obsidian';

export class NewNoteModal extends Modal {
  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: '新建笔记' });
    contentEl.createEl('p', { text: '新建笔记功能将在 Phase 3 实现' });
  }

  onClose(): void {
    const { contentEl } = this;
    contentEl.empty();
  }
}
