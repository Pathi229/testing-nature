import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, copyFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Journal, type ImageFiles } from '../src/core/journal';
import { migrate, SqlStore } from '../src/core/sql-store';
import { safeImageKey, uuidPattern } from '../src/core/backup';
import { connection, input, jpeg } from './helpers';

// A real-disk contract adapter, not an assertion that Expo's iOS file APIs were tested.
function diskFiles(root: string): ImageFiles {
  const folder = (id: string) => { assert.match(id, uuidPattern); return join(root, id); };
  return {
    async stage(id, original, cutout) {
      await mkdir(folder(id)); await copyFile(original, join(folder(id), 'original.jpg'));
      if (cutout) await copyFile(cutout, join(folder(id), 'cutout.png'));
    },
    async stageBackup(id, original, cutout) {
      await mkdir(folder(id)); await writeFile(join(folder(id), 'original.jpg'), Buffer.from(original, 'base64'));
      if (cutout) await writeFile(join(folder(id), 'cutout.png'), Buffer.from(cutout, 'base64'));
    },
    async remove(id) { await rm(folder(id), { recursive: true, force: true }); },
    async directories() { return readdir(root); },
    async read(key) { assert.equal(safeImageKey(key), true); return (await readFile(join(root, key))).toString('base64'); },
  };
}
test('durable record and copied photo reopen after deleting the original cache source', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wildfolio-disk-'));
  const images = join(root, 'documents'); await mkdir(images);
  const cachePhoto = join(root, 'cache-photo.jpg'); await writeFile(cachePhoto, Buffer.from(jpeg, 'base64'));
  const path = join(root, 'journal.db');
  const a = connection(path); await migrate(a.sql);
  const item = await new Journal(new SqlStore(a.sql), diskFiles(images)).save(input(), cachePhoto, null);
  a.db.close(); await rm(cachePhoto);
  const b = connection(path); await migrate(b.sql);
  const reopened = new Journal(new SqlStore(b.sql), diskFiles(images));
  assert.deepEqual((await reopened.list())[0], item);
  assert.equal(await diskFiles(images).read(item.originalPath), jpeg);
  const backup = await reopened.export(); assert.equal(JSON.parse(backup).images[item.originalPath], jpeg);
  b.db.close(); await rm(root, { recursive: true });
});
test('a real copy failure after writing the original removes partial files and creates no record', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wildfolio-disk-'));
  const images = join(root, 'documents'); await mkdir(images);
  const photo = join(root, 'photo.jpg'); await writeFile(photo, Buffer.from(jpeg, 'base64'));
  const c = connection(); await migrate(c.sql);
  const journal = new Journal(new SqlStore(c.sql), diskFiles(images));
  await assert.rejects(journal.save({ ...input(), artwork: 'cutout' }, photo, join(root, 'missing-cutout.png')), /ENOENT/);
  assert.deepEqual(await journal.list(), []); assert.deepEqual(await readdir(images), []);
  c.db.close(); await rm(root, { recursive: true });
});
test('repeated observations reference a separate species record (test-only taxonomy)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'wildfolio-species-')); const c = connection(); await migrate(c.sql);
  const store = new SqlStore(c.sql);
  const base = { ...input(), identificationStatus: 'identified' as const, taxonId: 'fixture-only:1', scientificName: 'Fixture taxon', identificationProvider: 'fixture-only', cutoutPath: null };
  const otherId = '44444444-4444-4444-8444-444444444444';
  await store.insert([{ ...base, originalPath: `${base.id}/original.jpg` }, { ...base, id: otherId, originalPath: `${otherId}/original.jpg` }]);
  assert.equal((await store.list()).length, 2); assert.equal((await c.sql.all('SELECT * FROM species')).length, 1);
  c.db.close(); await rm(root, { recursive: true });
});
