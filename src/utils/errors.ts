export type VaultErrorCode =
  | 'PATH_NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'PATH_NOT_OBSIDIAN'
  | 'SCAN_INTERRUPTED'
  | 'FILE_TOO_LARGE'
  | 'DISK_FULL'
  | 'UNKNOWN';

const ERROR_MESSAGES: Record<VaultErrorCode, string> = {
  PATH_NOT_FOUND: '路径不存在',
  PERMISSION_DENIED: '权限不足，无法读取',
  PATH_NOT_OBSIDIAN: '未检测到 .obsidian 配置目录',
  SCAN_INTERRUPTED: '扫描被中断',
  FILE_TOO_LARGE: '文件过大，跳过全文索引',
  DISK_FULL: '磁盘空间不足',
  UNKNOWN: '未知错误',
};

export class VaultError extends Error {
  constructor(
    public code: VaultErrorCode,
    public vaultId?: string,
    message?: string,
  ) {
    super(message || ERROR_MESSAGES[code]);
    this.name = 'VaultError';
  }
}
