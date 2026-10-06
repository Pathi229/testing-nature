import type { Observation } from './model';

export type Sql = {
  exec(sql: string): Promise<void>;
  run(sql: string, ...params: (string | number | null)[]): Promise<void>;
  all<T>(sql: string, ...params: (string | number | null)[]): Promise<T[]>;
  transaction<T>(work: (sql: Sql) => Promise<T>): Promise<T>;
};
export const schemaVersion = 2;
export async function migrate(sql: Sql) {
  const version = (await sql.all<{ user_version: number }>('PRAGMA user_version'))[0]?.user_version ?? 0;
  if (version > schemaVersion) throw new Error('This journal was created by a newer app. Update Wildfolio before opening it.');
  await sql.transaction(async (tx) => {
    if (version < 1) {
      await tx.exec(`CREATE TABLE observations (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0);
        CREATE TABLE species (taxon_id TEXT PRIMARY KEY NOT NULL, scientific_name TEXT NOT NULL, provider TEXT NOT NULL);
        PRAGMA user_version = 1;`);
    }
    if (version < 2) {
      await tx.exec('CREATE INDEX IF NOT EXISTS observations_active ON observations(deleted); PRAGMA user_version = 2;');
    }
  });
}
export class SqlStore {
  constructor(private sql: Sql) {}
  async list(includeDeleted = false) {
    const rows = await this.sql.all<{ payload: string }>(`SELECT payload FROM observations ${includeDeleted ? '' : 'WHERE deleted = 0'} ORDER BY id`);
    return rows.map(r => JSON.parse(r.payload) as Observation);
  }
  async ids() { return (await this.list(true)).map(r => r.id); }
  async pendingDeletes() { return (await this.sql.all<{ id: string }>('SELECT id FROM observations WHERE deleted = 1')).map(r => r.id); }
  async insert(items: Observation[]) {
    await this.sql.transaction(async tx => {
      for (const item of items) {
        await tx.run('INSERT INTO observations (id, payload) VALUES (?, ?)', item.id, JSON.stringify(item));
        if (item.taxonId && item.scientificName) await tx.run('INSERT OR IGNORE INTO species (taxon_id, scientific_name, provider) VALUES (?, ?, ?)', item.taxonId, item.scientificName, item.identificationProvider);
      }
    });
  }
  async update(item: Observation) { await this.sql.run('UPDATE observations SET payload = ? WHERE id = ? AND deleted = 0', JSON.stringify(item), item.id); }
  async markDeleted(id: string) { await this.sql.run('UPDATE observations SET deleted = 1 WHERE id = ?', id); }
  async finishDelete(id: string) { await this.sql.run('DELETE FROM observations WHERE id = ? AND deleted = 1', id); }
}
