import type { Candidate } from '../core/model';
import { vision, type VisionResult } from '../../modules/wildfolio-vision';
export type IdentificationProvider = {
  id: string;
  identify(result: VisionResult | null): Promise<{ candidates: Candidate[]; explanation: string }>;
};
export const identificationProvider: IdentificationProvider = {
  id: 'apple-vision-clues',
  async identify(result) {
    return {
      candidates: result?.candidates ?? [],
      explanation: result?.candidates.length ? 'General image labels from Apple Vision. These are clues, not species identifications.' : 'Image clues are unavailable. You can save this discovery as unknown or enter an unverified name.',
    };
  },
};
export function processingCapability() {
  if (!vision) return { available: false, message: 'Using your original photo. Apple Vision cutouts and image clues require a rebuilt iOS development app; they are not available in Expo Go or Android.' };
  const caps = vision.capabilities();
  return { available: caps.masking || caps.classification, message: caps.masking ? 'Apple Vision processes images on your device. Results may need review.' : 'Foreground cutouts require iOS 17 or later and a supported device. The original photo will remain available.' };
}
