import * as ImagePicker from 'expo-image-picker';
import * as FS from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Crypto from 'expo-crypto';
import { localDate, type Candidate } from '../core/model';
import { draftDirectory, discardDraft } from './storage';
import { vision } from '../../modules/wildfolio-vision';
import { identificationProvider, processingCapability } from './identification';

export type Draft = { id: string; source: 'camera' | 'import'; originalUri: string; cutouts: { instanceId: number; uri: string }[]; candidates: Candidate[]; provider: string; observedDate: string | null; messages: string[] };
export async function acquire(source: 'camera' | 'import') {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera permission was denied. You can import a photo instead, or allow camera access in iPhone Settings.');
  }
  // System picker does not require broad photo-library permission on modern iOS.
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, exif: false, allowsEditing: false, allowsMultipleSelection: false });
  if (result.canceled) return null;
  const image = result.assets[0];
  if (!image || !image.uri || image.width <= 0 || image.height <= 0) throw new Error('No readable image was returned. Choose a different photo.');
  return image;
}
export async function prepare(image: ImagePicker.ImagePickerAsset, source: 'camera' | 'import', onProgress: (step: string) => void, signal: AbortSignal, requestId: string): Promise<Draft> {
  const dir = draftDirectory(requestId);
  let normalizedUri: string | null = null;
  const abort = () => { if (signal.aborted) throw new Error('Processing cancelled.'); };
  try {
    await FS.makeDirectoryAsync(dir, { intermediates: true });
    abort(); onProgress('Preparing your photograph…');
    const dimension = Math.max(image.width, image.height);
    const resize = dimension > 4096 ? [{ resize: image.width >= image.height ? { width: 4096 } : { height: 4096 } }] : [];
    // Native image decoder normalizes camera orientation and bounds permanent evidence to 4096px.
    const normalized = await manipulateAsync(image.uri, resize, { compress: 0.88, format: SaveFormat.JPEG });
    normalizedUri = normalized.uri;
    abort();
    const originalUri = dir + 'original.jpg';
    await FS.copyAsync({ from: normalized.uri, to: originalUri });
    const messages = [source === 'import' ? 'Photo metadata is not read. Enter the observed date and place manually; no current location is attached.' : 'Observed date starts with today. Place and location are optional and are never attached automatically.'];
    let nativeResult = null;
    const capability = processingCapability();
    messages.push(capability.message);
    if (vision && capability.available) {
      abort();
      onProgress('Looking for subjects and image clues…');
      try { nativeResult = await vision.process(originalUri, dir, requestId); messages.push(...nativeResult.warnings); }
      catch (e) { abort(); messages.push(`Image processing failed. Your original photo can still be saved. ${e instanceof Error ? e.message : ''}`); }
    }
    abort();
    const clues = await identificationProvider.identify(nativeResult);
    messages.push(clues.explanation);
    return { id: requestId, source, originalUri, cutouts: nativeResult?.cutouts ?? [], candidates: clues.candidates, provider: clues.candidates.length ? identificationProvider.id : 'none', observedDate: source === 'camera' ? localDate() : null, messages };
  } catch (e) { try { await discardDraft(requestId); } catch { /* Clean on next launch. */ } throw e; }
  finally { if (normalizedUri) try { await FS.deleteAsync(normalizedUri, { idempotent: true }); } catch { /* Cache is transient. */ } }
}
export function newRequestId() { return Crypto.randomUUID(); }
