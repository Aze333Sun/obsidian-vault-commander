import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/performance/*.perf.ts'],
    setupFiles: ['test/setup.ts'],
    environment: 'node',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: [
        'src/core/**',
        'src/utils/**',
      ],
      exclude: [
        'src/types/**',
        'src/ui/**',
        'src/views/**',
        'src/modals/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      reportOnFailure: true,
    },
  },
});
