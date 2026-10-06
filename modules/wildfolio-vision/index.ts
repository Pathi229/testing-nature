import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { Candidate } from '../../src/core/model';

export type VisionResult = { cutouts: { instanceId: number; uri: string }[]; candidates: Candidate[]; warnings: string[] };
export type VisionModule = {
  capabilities(): { masking: boolean; classification: boolean };
  process(uri: string, outputDirectory: string, requestId: string): Promise<VisionResult>;
  cancel(requestId: string): void;
};
// Optional lookup is essential: this module is absent in Expo Go and Android.
export const vision = Platform.OS === 'ios' ? requireOptionalNativeModule<VisionModule>('WildfolioVision') : null;
