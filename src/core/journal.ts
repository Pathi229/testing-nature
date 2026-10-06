import { maxBackupBytes, validateBackup, validateObservation, type Backup } from './backup';
import type { Observation, ObservationInput } from './model';
import type { SqlStore } from './sql-store';

export type ImageFiles = {
  stage(id: string, originalUri: string, cutoutUri: string | null): Promise<void>;
  stageBackup(id: string, originalBase64: string, cutoutBase64: string | null): Promise<void>;
  remove(id: string): Promise<void>;
  directories(): Promise<string[]>;
  read(key: string): Promise<string>;
};
export class Journal {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private store: SqlStore, private files: ImageFiles) {}
  private exclusive<T>(work: () => Promise<T>): Promise<T> {
    const next = this.tail.then(work, work);
    this.tail = next.catch(() => {});
    return next;
  }
  list() { return this.exclusive(() => this.store.list()); }
  recover() {
    return this.exclusive(async () => {
      const warnings: string[] = [];
      for (const id of await this.store.pendingDeletes()) {
        try { await this.files.remove(id); await this.store.finishDelete(id); }
        catch { warnings.push('Some deleted images could not be removed. Retry cleanup in Settings.'); }
      }
      const ids = new Set(await this.store.ids());
      for (const id of await this.files.directories()) {
        if (!ids.has(id)) {
          try { await this.files.remove(id); } catch { warnings.push('Some unfinished image files need cleanup. Retry in Settings.'); }
        }
      }
      return [...new Set(warnings)];
    });
  }
  save(input: ObservationInput, originalUri: string, cutoutUri: string | null) {
    return this.exclusive(async () => {
      const item = validateObservation({ ...input, originalPath: `${input.id}/original.jpg`, cutoutPath: cutoutUri ? `${input.id}/cutout.png` : null });
      if ((await this.store.ids()).includes(item.id)) throw new Error('This sighting is already saved. Reopen it from your collection.');
      try {
        await this.files.stage(item.id, originalUri, cutoutUri);
        await this.store.insert([item]);
        return item;
      } catch (e) {
        try { await this.files.remove(item.id); } catch { /* Recover cleans unreferenced directories on next launch. */ }
        throw e;
      }
    });
  }
  update(item: Observation) {
    return this.exclusive(async () => {
      validateObservation(item);
      const old = (await this.store.list()).find(r => r.id === item.id);
      if (!old) throw new Error('This sighting is no longer in the journal.');
      if (old.originalPath !== item.originalPath || old.cutoutPath !== item.cutoutPath) throw new Error('Image replacement is not supported in observation editing.');
      await this.store.update(item);
    });
  }
  delete(id: string) {
    return this.exclusive(async () => {
      await this.store.markDeleted(id);
      try { await this.files.remove(id); await this.store.finishDelete(id); return null; }
      catch { return 'Sighting removed from the collection. Its image cleanup is pending; retry in Settings.'; }
    });
  }
  export() {
    return this.exclusive(async () => {
      const observations = await this.store.list();
      const images: Record<string, string> = Object.create(null);
      let bytes = 0;
      for (const item of observations) {
        for (const key of [item.originalPath, item.cutoutPath].filter((k): k is string => !!k)) {
          const image = await this.files.read(key);
          bytes += image.length;
          if (bytes > maxBackupBytes - 1024 * 1024) throw new Error('Journal is too large for the current 96 MB backup format. Export before adding more large images.');
          images[key] = image;
        }
      }
      const backup: Backup = { format: 'wildfolio-journal', version: 1, exportedAt: new Date().toISOString(), observations, images };
      const json = JSON.stringify(backup);
      validateBackup(json);
      return json;
    });
  }
  restore(json: string) {
    return this.exclusive(async () => {
      const backup = validateBackup(json);
      const existing = new Set(await this.store.ids());
      const additions = backup.observations.filter(r => !existing.has(r.id));
      const staged: string[] = [];
      try {
        for (const item of additions) {
          // Record before writes so partially staged folders get cleaned on any failure.
          staged.push(item.id);
          await this.files.stageBackup(item.id, backup.images[item.originalPath]!, item.cutoutPath ? backup.images[item.cutoutPath]! : null);
        }
        await this.store.insert(additions);
      } catch (e) {
        for (const id of staged) { try { await this.files.remove(id); } catch { /* Retry through recover. */ } }
        throw e;
      }
      return { added: additions.length, skipped: backup.observations.length - additions.length };
    });
  }
}
