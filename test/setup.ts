import { vi } from 'vitest';

// Mock global browser APIs that might not exist in Node environment
vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback, _opts?: IdleRequestOptions) => {
  const start = Date.now();
  return setTimeout(() => cb({ didTimeout: false, timeRemaining: () => Math.max(0, 50 - (Date.now() - start)) }), 0);
});

vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id));

vi.stubGlobal('performance', {
  now: () => Date.now(),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByName: vi.fn().mockReturnValue([]),
  getEntriesByType: vi.fn().mockReturnValue([]),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
});

vi.stubGlobal('window', {
  open: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});
