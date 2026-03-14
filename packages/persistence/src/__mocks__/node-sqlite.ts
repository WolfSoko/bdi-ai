// Mock for node:sqlite used in vitest (which uses Vite and can't resolve node: built-ins)

interface MockStatement {
  run: (...args: unknown[]) => void;
  get: (...args: unknown[]) => undefined;
  all: (...args: unknown[]) => unknown[];
}

class MockDatabaseSync {
  exec(_sql: string): void {
    // no-op
  }

  prepare(_sql: string): MockStatement {
    return {
      run: () => undefined,
      get: () => undefined,
      all: () => [],
    };
  }

  close(): void {
    // no-op
  }
}

export const DatabaseSync = MockDatabaseSync;
