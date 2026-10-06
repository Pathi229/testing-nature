import * as SQLite from 'expo-sqlite';
import * as FS from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { maxImageBytes, safeImageKey, uuidPattern } from '../core/backup';
import { Journal, type ImageFiles } from '../core/journal';
import { migrate, SqlStore, type Sql } from '../core/sql-store';

export const documentRoot = `${FS.documentDirectory}wildfolio/`;
export const imageRoot = `${documentRoot}images/`;
export const draftRoot = `${documentRoot}drafts/`;
export function imageUri(key: string) {
  if (!safeImageKey(key)) throw new Error('Invalid journal image path.');
  return imageRoot + key;
}
export function draftDirectory(id: string) {
  if (!uuidPattern.test(id)) throw new Error('Invalid draft ID.');
  return draftRoot + id + '/';
}
function directory(id: string) {
  if (!uuidPattern.test(id)) throw new Error('Invalid sighting ID.');
  return imageRoot + id + '/';
}
async function sizeCheck(uri: string) {
  const info = await FS.getInfoAsync(uri);
  if (!info.exists || info.isDirectory || info.size === 0 || info.size > maxImageBytes) throw new Error('Image is missing, invalid, or exceeds the 24 MB image limit. Choose a smaller photo.');
}
const files: ImageFiles = {
  async stage(id, originalUri, cutoutUri) {
    const target = directory(id);
    // Never overwrite a folder from a previous partial operation before explicit recovery.
    if ((await FS.getInfoAsync(target)).exists) throw new Error('An unfinished save needs cleanup. Retry cleanup in Settings, then save again.');
    await FS.makeDirectoryAsync(target, { intermediates: true });
    await sizeCheck(originalUri);
    await FS.copyAsync({ from: originalUri, to: target + 'original.jpg' });
    await sizeCheck(target + 'original.jpg');
    if (cutoutUri) {
      await sizeCheck(cutoutUri);
      await FS.copyAsync({ from: cutoutUri, to: target + 'cutout.png' });
      await sizeCheck(target + 'cutout.png');
    }
  },
  async stageBackup(id, original, cutout) {
    const target = directory(id);
    if ((await FS.getInfoAsync(target)).exists) throw new Error('An unfinished restore needs cleanup. Retry cleanup in Settings.');
    await FS.makeDirectoryAsync(target, { intermediates: true });
    for (const [name, data] of [['original.jpg', original], ['cutout.png', cutout]] as const) {
      if (!data) continue;
      const path = target + name;
      await FS.writeAsStringAsync(path, data, { encoding: FS.EncodingType.Base64 });
      await sizeCheck(path);
      // Ask the native decoder to actually decode imported images, not just trust a header.
      const decoded = await manipulateAsync(path, [], { format: name.endsWith('png') ? SaveFormat.PNG : SaveFormat.JPEG, compress: 1 });
      try {
        if (decoded.width > 4096 || decoded.height > 4096 || decoded.width <= 0 || decoded.height <= 0) throw new Error('Backup contains an oversized image.');
      } finally { await FS.deleteAsync(decoded.uri, { idempotent: true }); }
    }
  },
  async remove(id) { await FS.deleteAsync(directory(id), { idempotent: true }); },
  async directories() { return (await FS.readDirectoryAsync(imageRoot)).filter(id => uuidPattern.test(id)); },
  async read(key) { await sizeCheck(imageUri(key)); return FS.readAsStringAsync(imageUri(key), { encoding: FS.EncodingType.Base64 }); },
};
function sqlAdapter(db: SQLite.SQLiteDatabase): Sql {
  const base = {
    exec: (s: string) => db.execAsync(s),
    run: async (s: string, ...params: (string | number | null)[]) => { await db.runAsync(s, params); },
    all: <T,>(s: string, ...params: (string | number | null)[]) => db.getAllAsync<T>(s, params),
  };
  return {
    ...base,
    transaction: async <T,>(work: (sql: Sql) => Promise<T>) => {
      let result!: T;
      await db.withExclusiveTransactionAsync(async tx => {
        const nested: Sql = { exec: s => tx.execAsync(s), run: async (s, ...p) => { await tx.runAsync(s, p); }, all: <R,>(s: string, ...p: (string | number | null)[]) => tx.getAllAsync<R>(s, p), transaction: work => work(nested) };
        result = await work(nested);
      });
      return result;
    },
  };
}
let opening: Promise<Journal> | null = null;
export function openJournal() {
  if (!opening) opening = (async () => {
    if (!FS.documentDirectory) throw new Error('Persistent device storage is unavailable. Use the iOS or Android app.');
    await FS.makeDirectoryAsync(imageRoot, { intermediates: true });
    await FS.makeDirectoryAsync(draftRoot, { intermediates: true });
    const db = await SQLite.openDatabaseAsync('wildfolio.db');
    try {
      await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
      const sql = sqlAdapter(db);
      await migrate(sql);
      return new Journal(new SqlStore(sql), files);
    } catch (e) { await db.closeAsync(); throw e; }
  })().catch(e => { opening = null; throw e; });
  return opening;
}
export async function discardDraft(id: string) {
  await FS.deleteAsync(draftDirectory(id), { idempotent: true });
}
export async function cleanStaleDrafts() {
  // Called once at launch, before a new draft can exist. Drafts are not saved observations.
  for (const id of await FS.readDirectoryAsync(draftRoot)) if (uuidPattern.test(id)) await discardDraft(id);
}
