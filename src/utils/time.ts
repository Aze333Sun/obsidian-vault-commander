export class TimeUtils {
  static now(): number {
    return Date.now();
  }

  static formatRelative(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 30) return `${Math.floor(days / 30)} 个月前`;
    if (days > 0) return `${days} 天前`;
    if (hours > 0) return `${hours} 小时前`;
    if (minutes > 0) return `${minutes} 分钟前`;
    return '刚刚';
  }

  static formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  static formatTime(date: Date): string {
    return date.toTimeString().slice(0, 5);
  }

  static formatDateTime(date: Date): string {
    return date.toISOString().slice(0, 16).replace('T', ' ');
  }

  static daysBetween(ts1: number, ts2: number): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor(Math.abs(ts1 - ts2) / msPerDay);
  }

  static isWithin(lastModified: number, hours: number): boolean {
    const diff = Date.now() - lastModified;
    return diff <= hours * 60 * 60 * 1000;
  }
}
