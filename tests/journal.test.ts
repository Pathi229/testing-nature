import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Journal } from '../src/core/journal';
import { migrate, schemaVersion, SqlStore } from '../src/core/sql-store';
import { nameAndStatus, isDate } from '../src/core/model';
import { safeImageKey, validateBackup, validateObservation } from '../src/core/backup';
import { connection, ids, input, MemoryFiles, png } from './helpers';

async function setup() {
  const c = connection(); await migrate(c.sql);
  const files = new MemoryFiles();
  const journal = new Journal(new SqlStore(c.sql), files);
  return { ...c, files, journal };
}
test('migrations create schema v2 and can be run repeatedly without losing sightings', async () => {
  const { sql, db, journal } = await setup();
  await journal.save(input(), 'photo', null);
  await migrate(sql); await migrate(sql);
  assert.equal((await sql.all<{ user_version: number }>('PRAGMA user_version'))[0]!.user_version, schemaVersion);
  assert.equal((await journal.list()).length, 1); db.close();
});
test('v1 migrates in place and preserves records; future schemas are rejected', async () => {
  const { sql, db } = connection();
  await sql.exec('CREATE TABLE observations (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0); CREATE TABLE species (taxon_id TEXT PRIMARY KEY NOT NULL, scientific_name TEXT NOT NULL, provider TEXT NOT NULL); PRAGMA user_version = 1;');
  await sql.run('INSERT INTO observations (id, payload) VALUES (?, ?)', ids[0]!, JSON.stringify({ ...input(), originalPath: ids[0] + '/original.jpg', cutoutPath: null }));
  await migrate(sql); assert.equal((await new SqlStore(sql).list()).length, 1);
  await sql.exec('PRAGMA user_version = 99;');
  await assert.rejects(migrate(sql), /newer app/); db.close();
});
test('real SQLite persists an unknown imported observation through close and reopen', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'wildfolio-test-'));
  const path = join(dir, 'journal.db'); const files = new MemoryFiles();
  const a = connection(path); await migrate(a.sql);
  await new Journal(new SqlStore(a.sql), files).save(input(), 'photo', null); a.db.close();
  const b = connection(path); await migrate(b.sql);
  const records = await new Journal(new SqlStore(b.sql), files).list();
  assert.equal(records.length, 1); assert.equal(records[0]!.identificationStatus, 'unknown'); assert.equal(records[0]!.observedDate, null); assert.equal(records[0]!.coordinates, null); assert.equal(records[0]!.taxonId, null);
  b.db.close(); rmSync(dir, { recursive: true });
});
test('manual names remain unverified and category defaults remain unknown', () => {
  assert.deepEqual(nameAndStatus('  ', 'flower'), { displayName: 'Unknown flower', identificationStatus: 'unknown' });
  assert.deepEqual(nameAndStatus('Oak', 'tree'), { displayName: 'Oak', identificationStatus: 'unverified' });
  assert.equal(isDate('2026-02-30'), false); assert.equal(isDate('2024-02-29'), true);
});
test('file-copy failure leaves no record or images and permits retry with the same draft', async () => {
  const { files, journal, db } = await setup(); files.failWriteAt = 1;
  await assert.rejects(journal.save(input(), 'photo', null), /file failure/);
  assert.equal((await journal.list()).length, 0); assert.equal(files.values.size, 0);
  files.failWriteAt = 0; await journal.save(input(), 'photo', null);
  assert.equal((await journal.list()).length, 1); db.close();
});
test('database failure rolls back and removes staged images', async () => {
  const { files, journal, setFailInsert, db } = await setup(); setFailInsert(true);
  await assert.rejects(journal.save(input(), 'photo', 'cutout'), /database failure/);
  assert.equal((await journal.list()).length, 0); assert.equal(files.values.size, 0);
  setFailInsert(false); await journal.save(input(), 'photo', null); db.close();
});
test('failed cleanup leaves an orphan recoverable on the next launch', async () => {
  const { files, journal, setFailInsert, db } = await setup(); setFailInsert(true); files.failRemove = true;
  await assert.rejects(journal.save(input(), 'photo', null));
  assert.equal(files.values.size, 1); assert.equal((await journal.recover()).length, 1);
  files.failRemove = false; assert.deepEqual(await journal.recover(), []); assert.equal(files.values.size, 0); db.close();
});
test('concurrent duplicate save is serialized and cannot overwrite committed images', async () => {
  const { files, journal, db } = await setup();
  const results = await Promise.allSettled([journal.save(input(), 'photo', null), journal.save(input(), 'other', null)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await journal.list()).length, 1); assert.equal(files.values.size, 1); db.close();
});
test('deletion removes records and all related images', async () => {
  const { files, journal, db } = await setup(); await journal.save(input(), 'photo', 'cutout');
  assert.equal(files.values.size, 2); assert.equal(await journal.delete(ids[0]!), null);
  assert.equal((await journal.list()).length, 0); assert.equal(files.values.size, 0); db.close();
});
test('failed image deletion hides the sighting and retries from a persistent tombstone', async () => {
  const { files, journal, db, sql } = await setup(); await journal.save(input(), 'photo', null); files.failRemove = true;
  assert.match((await journal.delete(ids[0]!))!, /cleanup is pending/);
  assert.equal((await journal.list()).length, 0); assert.equal((await new SqlStore(sql).pendingDeletes()).length, 1);
  files.failRemove = false; await journal.recover(); assert.equal(files.values.size, 0); assert.deepEqual(await new SqlStore(sql).ids(), []); db.close();
});
test('metadata edit persists without replacing artwork files', async () => {
  const { files, journal, db } = await setup(); const saved = await journal.save(input(), 'photo', null);
  await journal.update({ ...saved, ...nameAndStatus('Bird by the river', 'animal'), place: 'Kandy', notes: 'At dusk' });
  assert.equal((await journal.list())[0]!.notes, 'At dusk'); assert.equal(files.values.size, 1);
  await assert.rejects(journal.update({ ...saved, originalPath: '../../other' })); db.close();
});
test('portable export/restore includes originals, cutouts and private location with duplicate skip', async () => {
  const a = await setup(); const b = await setup();
  await a.journal.save({ ...input(), artwork: 'cutout', coordinates: { latitude: 7.29, longitude: 80.63, accuracy: 20 }, locationProvenance: 'device-at-user-request' }, 'photo', 'cutout');
  const backup = await a.journal.export();
  assert.deepEqual(await b.journal.restore(backup), { added: 1, skipped: 0 });
  const imported = (await b.journal.list())[0]!;
  await b.journal.update({ ...imported, notes: 'Edited after restore' });
  assert.deepEqual(await b.journal.restore(backup), { added: 0, skipped: 1 });
  assert.equal((await b.journal.list())[0]!.notes, 'Edited after restore'); assert.equal(b.files.values.size, 2);
  a.db.close(); b.db.close();
});
test('restore file failure is atomic for records and cleans all partial files', async () => {
  const a = await setup(); const b = await setup();
  await a.journal.save(input(), 'photo', null); await a.journal.save(input(ids[1]), 'photo', null);
  b.files.failWriteAt = 2;
  await assert.rejects(b.journal.restore(await a.journal.export()), /file failure/);
  assert.equal((await b.journal.list()).length, 0); assert.equal(b.files.values.size, 0);
  a.db.close(); b.db.close();
});
test('restore DB failure does not retain any newly restored records or files', async () => {
  const a = await setup(); const b = await setup(); await a.journal.save(input(), 'photo', null);
  b.setFailInsert(true); await assert.rejects(b.journal.restore(await a.journal.export()), /database failure/);
  assert.equal((await b.journal.list()).length, 0); assert.equal(b.files.values.size, 0); a.db.close(); b.db.close();
});
test('restore rejects unsafe paths, mismatched references, extra images and prototype keys before any writes', async () => {
  const a = await setup(); const b = await setup(); await a.journal.save(input(), 'photo', null);
  const backup = JSON.parse(await a.journal.export());
  for (const key of ['../../etc/passwd', '/tmp/photo.jpg', 'C:\\data.jpg', ids[0] + '/../../other', '__proto__']) {
    assert.equal(safeImageKey(key), false);
    const malformed = structuredClone(backup);
    Object.defineProperty(malformed.images, key, { value: '/9j/AA==', enumerable: true });
    await assert.rejects(b.journal.restore(JSON.stringify(malformed)));
  }
  const malformed = structuredClone(backup); malformed.observations[0].originalPath = ids[1] + '/original.jpg';
  await assert.rejects(b.journal.restore(JSON.stringify(malformed))); assert.equal(b.files.writes, 0);
  a.db.close(); b.db.close();
});
test('backup rejects duplicate UUIDs, broken encodings, future formats and invalid dates', async () => {
  const { journal, db } = await setup(); await journal.save(input(), 'photo', null);
  const backup = JSON.parse(await journal.export());
  const changes = [(b: typeof backup) => { b.observations.push(b.observations[0]); }, (b: typeof backup) => { b.version = 7; }, (b: typeof backup) => { b.images[ids[0] + '/original.jpg'] = 'not base64'; }, (b: typeof backup) => { b.observations[0].observedDate = '2026-02-30'; }];
  for (const change of changes) { const bad = structuredClone(backup); change(bad); assert.throws(() => validateBackup(JSON.stringify(bad))); }
  db.close();
});
test('identified status requires a stable taxon; image clues cannot create one', () => {
  assert.throws(() => validateObservation({ ...input(), identificationStatus: 'identified', candidates: [{ label: 'animal', score: 0.9 }], originalPath: ids[0] + '/original.jpg', cutoutPath: null }));
});
test('export fails honestly if an evidence image is missing', async () => {
  const { journal, files, db } = await setup(); await journal.save(input(), 'photo', null); files.values.clear();
  await assert.rejects(journal.export(), /Missing image/); db.close();
});
test('restore rejects truncated images and oversized advertised dimensions before staging files', async () => {
  const a = await setup(); const b = await setup(); await a.journal.save(input(), 'photo', 'cutout');
  const backup = JSON.parse(await a.journal.export());
  const badJpeg = structuredClone(backup); badJpeg.images[ids[0] + '/original.jpg'] = '/9j/AA==';
  await assert.rejects(b.journal.restore(JSON.stringify(badJpeg)));
  const hugePng = Buffer.from(png, 'base64'); hugePng.writeUInt32BE(100000, 16);
  backup.images[ids[0] + '/cutout.png'] = hugePng.toString('base64');
  await assert.rejects(b.journal.restore(JSON.stringify(backup)));
  assert.equal(b.files.writes, 0); a.db.close(); b.db.close();
});
