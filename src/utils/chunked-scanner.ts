export class ChunkedScanner {
  private abortController: AbortController | null = null;

  async scanInChunks<T>(
    items: T[],
    processItem: (item: T) => Promise<void>,
    chunkSize = 50,
    onProgress?: (progress: { current: number; total: number; percent: number }) => void,
  ): Promise<void> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    for (let i = 0; i < items.length; i += chunkSize) {
      if (signal.aborted) throw new Error('SCAN_ABORTED');

      const chunk = items.slice(i, Math.min(i + chunkSize, items.length));
      await Promise.all(chunk.map(processItem));

      onProgress?.({
        current: Math.min(i + chunkSize, items.length),
        total: items.length,
        percent: Math.min(((i + chunkSize) / items.length) * 100, 100),
      });

      await this.yieldToMainThread();
    }
  }

  cancel(): void {
    this.abortController?.abort();
  }

  private yieldToMainThread(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(() => resolve(), { timeout: 50 });
      } else {
        setTimeout(resolve, 0);
      }
    });
  }
}
