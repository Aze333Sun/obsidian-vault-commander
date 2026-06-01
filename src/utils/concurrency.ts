type Task<T> = () => Promise<T>;

export class ConcurrencyController {
  private activeCount = 0;
  private queue: Array<{ task: Task<any>; resolve: any; reject: any }> = [];

  constructor(private concurrency: number) {}

  async run<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.next();
    });
  }

  private next(): void {
    if (this.activeCount >= this.concurrency || this.queue.length === 0) return;
    const { task, resolve, reject } = this.queue.shift()!;
    this.activeCount++;

    task()
      .then(resolve, reject)
      .finally(() => {
        this.activeCount--;
        this.next();
      });
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get isIdle(): boolean {
    return this.activeCount === 0 && this.queue.length === 0;
  }
}

export function getConcurrencyForStorage(storageType: 'ssd' | 'hdd' | 'nas' | 'remote'): {
  stat: number;
  read: number;
} {
  switch (storageType) {
    case 'ssd':
      return { stat: 50, read: 20 };
    case 'hdd':
      return { stat: 8, read: 4 };
    case 'nas':
      return { stat: 8, read: 4 };
    case 'remote':
      return { stat: 3, read: 2 };
  }
}

export async function detectStorageType(
  testPath: string,
): Promise<'ssd' | 'hdd' | 'nas' | 'remote'> {
  const path = await import('path');
  const fs = await import('fs');
  const testFile = path.join(testPath, '.vc-storage-test');
  try {
    const start = performance.now();
    await fs.promises.stat(testFile);
    const duration = performance.now() - start;

    if (duration < 0.5) return 'ssd';
    if (duration < 3) return 'hdd';
    if (duration < 10) return 'nas';
    return 'remote';
  } catch {
    return 'ssd';
  }
}
