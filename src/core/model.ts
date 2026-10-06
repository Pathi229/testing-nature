export const categories = ['animal', 'flower', 'tree'] as const;
export type Category = typeof categories[number];
export type Candidate = { label: string; score: number };
export type Species = { taxonId: string; scientificName: string; provider: string };
export type Observation = {
  id: string;
  category: Category;
  displayName: string;
  taxonId: string | null;
  scientificName: string | null;
  identificationStatus: 'unknown' | 'unverified' | 'identified';
  identificationProvider: string;
  candidates: Candidate[];
  observedDate: string | null;
  createdAt: string;
  source: 'camera' | 'import';
  place: string;
  country: string;
  coordinates: { latitude: number; longitude: number; accuracy: number | null } | null;
  locationProvenance: 'none' | 'device-at-user-request';
  notes: string;
  originalPath: string;
  cutoutPath: string | null;
  artwork: 'original' | 'cutout';
};
export type ObservationInput = Omit<Observation, 'originalPath' | 'cutoutPath'>;
export const categoryNames: Record<Category, string> = { animal: 'Animals', flower: 'Flowers', tree: 'Trees' };
export function unknownName(category: Category) { return `Unknown ${category}`; }
export function nameAndStatus(name: string, category: Category) {
  const clean = name.trim();
  return { displayName: clean || unknownName(category), identificationStatus: clean && clean !== unknownName(category) ? 'unverified' as const : 'unknown' as const };
}
export function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function artworkPath(item: Observation) { return item.artwork === 'cutout' && item.cutoutPath ? item.cutoutPath : item.originalPath; }
