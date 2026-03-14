import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Wrapper type to expose the same interface used by repositories
export type AppDatabase = DatabaseSync;

let db: AppDatabase | null = null;

export function getDatabase(path = 'bdi_state.db'): AppDatabase {
  if (!db) {
    db = new DatabaseSync(path);
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: AppDatabase): void {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
