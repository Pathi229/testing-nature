import { isDate, type Observation } from './model';

export const maxBackupBytes = 96 * 1024 * 1024;
export const maxImageBytes = 24 * 1024 * 1024;
export type Backup = { format: 'wildfolio-journal'; version: 1; exportedAt: string; observations: Observation[]; images: Record<string, string> };
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function safeImageKey(key: string) {
  const parts = key.split('/');
  return parts.length === 2 && uuidPattern.test(parts[0]!) && ['original.jpg', 'cutout.png'].includes(parts[1]!);
}
function record(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object' && !Array.isArray(v); }
function text(v: unknown, max = 4000): v is string { return typeof v === 'string' && v.length <= max && !v.includes('\0'); }
function instant(v: unknown): v is string { return text(v, 40) && /^\d{4}-\d\d-\d\dT/.test(v) && !Number.isNaN(Date.parse(v)); }
function invalid(): never { throw new Error('Invalid or unsupported journal backup. Nothing was restored.'); }
function checkImageDimensions(base64: string, png: boolean) {
  // Inspect a bounded header before handing untrusted backup bytes to a native decoder.
  // This prevents a tiny compressed file advertising huge dimensions from exhausting memory.
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const prefix = base64.slice(0, png ? 44 : 350000);
  const bytes: number[] = [];
  let buffer = 0; let bits = 0;
  for (const char of prefix) {
    if (char === '=') break;
    buffer = (buffer << 6) | alphabet.indexOf(char); bits += 6;
    if (bits >= 8) { bits -= 8; bytes.push((buffer >> bits) & 255); }
  }
  let width = 0; let height = 0;
  if (png) {
    if (bytes.length < 24 || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') invalid();
    const u32 = (offset: number) => ((bytes[offset]! * 0x1000000) + (bytes[offset + 1]! << 16) + (bytes[offset + 2]! << 8) + bytes[offset + 3]!);
    width = u32(16); height = u32(20);
  } else {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset++] !== 255) invalid();
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++]!;
      if (marker === 0xDA || marker === 0xD9) break;
      const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
      if (length < 2 || offset + length > bytes.length) invalid();
      if (marker >= 0xC0 && marker <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marker)) {
        if (length < 8) invalid();
        height = (bytes[offset + 3]! << 8) | bytes[offset + 4]!;
        width = (bytes[offset + 5]! << 8) | bytes[offset + 6]!;
        break;
      }
      offset += length;
    }
  }
  if (width <= 0 || height <= 0 || width > 4096 || height > 4096) invalid();
}
export function validateObservation(v: unknown): Observation {
  if (!record(v) || !text(v.id, 36) || !uuidPattern.test(v.id) || !['animal', 'flower', 'tree'].includes(String(v.category))) invalid();
  if (!text(v.displayName, 120) || !v.displayName.trim() || !text(v.place, 200) || !text(v.country, 100) || !text(v.notes) || !instant(v.createdAt)) invalid();
  if (v.observedDate !== null && (!text(v.observedDate, 10) || !isDate(v.observedDate))) invalid();
  if (!['camera', 'import'].includes(String(v.source)) || !['unknown', 'unverified', 'identified'].includes(String(v.identificationStatus)) || !text(v.identificationProvider, 100)) invalid();
  if (v.taxonId !== null && (!text(v.taxonId, 200) || !v.taxonId)) invalid();
  if (v.scientificName !== null && (!text(v.scientificName, 200) || !v.scientificName)) invalid();
  if ((v.taxonId === null) !== (v.scientificName === null) || (v.identificationStatus === 'identified' && !v.taxonId)) invalid();
  if (!Array.isArray(v.candidates) || v.candidates.length > 20 || v.candidates.some(c => !record(c) || !text(c.label, 120) || !c.label || typeof c.score !== 'number' || !Number.isFinite(c.score) || c.score < 0 || c.score > 1)) invalid();
  if (!['none', 'device-at-user-request'].includes(String(v.locationProvenance))) invalid();
  let coordinates: Observation['coordinates'] = null;
  if (v.coordinates !== null) {
    const c = v.coordinates;
    if (!record(c) || typeof c.latitude !== 'number' || !Number.isFinite(c.latitude) || Math.abs(c.latitude) > 90 || typeof c.longitude !== 'number' || !Number.isFinite(c.longitude) || Math.abs(c.longitude) > 180 || (c.accuracy !== null && (typeof c.accuracy !== 'number' || !Number.isFinite(c.accuracy) || c.accuracy < 0))) invalid();
    coordinates = { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy as number | null };
  }
  if ((v.coordinates === null) !== (v.locationProvenance === 'none')) invalid();
  if (v.originalPath !== `${v.id}/original.jpg` || (v.cutoutPath !== null && v.cutoutPath !== `${v.id}/cutout.png`) || !['original', 'cutout'].includes(String(v.artwork)) || (v.artwork === 'cutout' && !v.cutoutPath)) invalid();
  // Reconstruct only known fields: never accept arbitrary imported path or prototype properties.
  return { id: v.id, category: v.category, displayName: v.displayName, taxonId: v.taxonId, scientificName: v.scientificName, identificationStatus: v.identificationStatus, identificationProvider: v.identificationProvider, candidates: v.candidates.map(c => ({ label: c.label, score: c.score })), observedDate: v.observedDate, createdAt: v.createdAt, source: v.source, place: v.place, country: v.country, coordinates, locationProvenance: v.locationProvenance, notes: v.notes, originalPath: v.originalPath, cutoutPath: v.cutoutPath, artwork: v.artwork } as Observation;
}
export function validateBackup(json: string): Backup {
  if (json.length > maxBackupBytes) throw new Error('Backup exceeds the current 96 MB restore limit.');
  let value: unknown;
  try { value = JSON.parse(json); } catch { invalid(); }
  if (!record(value) || value.format !== 'wildfolio-journal' || value.version !== 1 || !instant(value.exportedAt) || !Array.isArray(value.observations) || value.observations.length > 5000 || !record(value.images)) invalid();
  const observations = value.observations.map(validateObservation);
  const ids = new Set<string>();
  const keys = new Set<string>();
  for (const item of observations) {
    if (ids.has(item.id)) invalid();
    ids.add(item.id); keys.add(item.originalPath);
    if (item.cutoutPath) keys.add(item.cutoutPath);
  }
  const images: Record<string, string> = Object.create(null);
  if (Object.keys(value.images).length !== keys.size) invalid();
  for (const [key, base64] of Object.entries(value.images)) {
    if (!safeImageKey(key) || !keys.has(key) || !text(base64, Math.ceil(maxImageBytes / 3) * 4) || !base64.length || base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) invalid();
    // Reject mislabeled/invalid encodings before any writes. Native adapter also decodes before committing.
    if (key.endsWith('.jpg') ? !base64.startsWith('/9j/') : !base64.startsWith('iVBORw0KGgo')) invalid();
    checkImageDimensions(base64, key.endsWith('.png'));
    images[key] = base64;
  }
  return { format: 'wildfolio-journal', version: 1, exportedAt: value.exportedAt, observations, images };
}
