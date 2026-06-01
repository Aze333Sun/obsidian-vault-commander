type Listener = (...args: any[]) => void;

export class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, callback: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Listener): void {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event: string, ...payload: any[]): void {
    this.listeners.get(event)?.forEach(cb => {
      try {
        cb(...payload);
      } catch (err) {
        console.error(`[VC] EventBus error on "${event}":`, err);
      }
    });
  }

  once(event: string, callback: Listener): void {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  clear(): void {
    this.listeners.clear();
  }
}
