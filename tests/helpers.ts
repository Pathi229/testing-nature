import { DatabaseSync } from 'node:sqlite';
import type { ImageFiles } from '../src/core/journal';
import type { ObservationInput } from '../src/core/model';
import type { Sql } from '../src/core/sql-store';

// Fixtures are only loaded by tests, never by the app.
export const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
export const jpeg = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD2eiiisiD/2Q==';
export const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3z8AAAAASUVORK5CYII=';
export function input(id = ids[0]!): ObservationInput {
  return { id, category: 'animal', displayName: 'Unknown animal', taxonId: null, scientificName: null, identificationStatus: 'unknown', identificationProvider: 'none', candidates: [], observedDate: null, createdAt: '2026-10-06T12:00:00.000Z', source: 'import', place: '', country: '', coordinates: null, locationProvenance: 'none', notes: '', artwork: 'original' };
}
export function connection(path = ':memory:') {
  const db = new DatabaseSync(path);
  let failInsert = false;
  const sql: Sql = {
    async exec(s) { db.exec(s); },
    async run(s, ...p) { if (failInsert && s.startsWith('INSERT INTO observations')) throw new Error('Simulated database failure'); db.prepare(s).run(...p); },
    async all<T>(s: string, ...p: (string | number | null)[]) { return db.prepare(s).all(...p) as T[]; },
    async transaction<T>(work: (sql: Sql) => Promise<T>) {
      db.exec('BEGIN IMMEDIATE');
      try { const value = await work(sql); db.exec('COMMIT'); return value; }
      catch (e) { db.exec('ROLLBACK'); throw e; }
    },
  };
  return { sql, db, setFailInsert: (value: boolean) => { failInsert = value; } };
}
export class MemoryFiles implements ImageFiles {
  values = new Map<string, string>();
  failWriteAt = 0;
  writes = 0;
  failRemove = false;
  async stage(id: string, original: string, cutout: string | null) { await this.stageBackup(id, original === 'photo' ? jpeg : original, cutout === 'cutout' ? png : cutout); }
  async stageBackup(id: string, original: string, cutout: string | null) {
    this.values.set(`${id}/original.jpg`, original);
    this.writes++;
    if (this.failWriteAt === this.writes) throw new Error('Simulated file failure');
    if (cutout) this.values.set(`${id}/cutout.png`, cutout);
  }
  async remove(id: string) {
    if (this.failRemove) throw new Error('Simulated deletion failure');
    for (const key of this.values.keys()) if (key.startsWith(id + '/')) this.values.delete(key);
  }
  async directories() { return [...new Set([...this.values.keys()].map(k => k.split('/')[0]!))]; }
  async read(key: string) { const value = this.values.get(key); if (!value) throw new Error('Missing image'); return value; }
}
