import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Integration tests hit a real local Postgres/Redis — run test files
    // serially so shared DB fixtures don't collide across files.
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
