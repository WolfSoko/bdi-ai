import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    alias: {
      'node:sqlite': resolve(__dirname, '../persistence/src/__mocks__/node-sqlite.ts'),
    },
  },
});
