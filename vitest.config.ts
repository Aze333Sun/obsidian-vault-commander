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
        // Requires Obsidian runtime / filesystem — tested via integration
        'src/core/scanner.ts',
        'src/core/cache.ts',
        'src/core/dispatcher.ts',
        'src/utils/file.ts',
        'src/utils/chunked-scanner.ts',
        'src/utils/concurrency.ts',
        'src/utils/performance.ts',
        'src/utils/errors.ts',
        'src/utils/i18n.ts',
        'src/utils/time.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 80,
        lines: 90,
      },
      reportOnFailure: true,
    },
  },
});
