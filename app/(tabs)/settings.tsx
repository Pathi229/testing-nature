import { useRef, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FS from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { branding } from '../../src/branding';
import { maxBackupBytes, validateBackup } from '../../src/core/backup';
import { documentRoot } from '../../src/platform/storage';
import { messageOf, useJournal } from '../../src/ui/JournalProvider';
import { Body, Button, Eyebrow, Heading, Notice, styles } from '../../src/ui/components';
import { processingCapability } from '../../src/platform/identification';

export default function Settings() {
  const { journal, ready, refresh, cleanup, warnings } = useJournal();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const run = async (work: () => Promise<void>) => {
    if (lock.current || !journal) return;
    lock.current = true; setBusy(true); setError(null); setStatus(null);
    try { await work(); } catch (e) { setError(messageOf(e)); }
    finally { lock.current = false; setBusy(false); }
  };
  const exportJournal = () => Alert.alert('Export your private journal?', 'The backup includes photographs, notes, and any exact private coordinates. Choose a safe destination such as Files; sharing to other apps can disclose this information.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Export', onPress: () => void run(async () => {
    if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is not available on this device.');
    const json = await journal!.export();
    const path = documentRoot + 'wildfolio-journal.json';
    await FS.writeAsStringAsync(path, json);
    await Sharing.shareAsync(path, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Wildfolio journal backup' });
    setStatus('Backup prepared. The share sheet may be cancelled; confirm the file exists in your chosen destination before relying on it.');
  }) }]);
  const restoreJournal = () => void run(async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json'], copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) throw new Error('No backup file selected.');
    try {
      const info = await FS.getInfoAsync(asset.uri);
      if (!info.exists || info.isDirectory || info.size > maxBackupBytes) throw new Error('Choose a Wildfolio JSON backup smaller than 96 MB.');
      const json = await FS.readAsStringAsync(asset.uri);
      const preview = validateBackup(json);
      const confirmed = await new Promise<boolean>(resolve => Alert.alert('Restore this journal?', `${preview.observations.length} sightings in the backup. New IDs will be added; existing IDs will be skipped without overwriting your edits.`, [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Restore', onPress: () => resolve(true) }], { cancelable: true, onDismiss: () => resolve(false) }));
      if (!confirmed) return;
      const restored = await journal!.restore(json);
      await refresh(); setStatus(`Restored ${restored.added} sightings. Skipped ${restored.skipped} existing IDs. Nothing was overwritten.`);
    } finally { await FS.deleteAsync(asset.uri, { idempotent: true }).catch(() => {}); }
  });
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Eyebrow>{branding.name} · journal care</Eyebrow><Heading>Keep your memories safe.</Heading>
    <Body>Your journal lives on this device. There is no account, server, analytics, or paid identification API. Photos and records are saved in permanent app storage before a save is reported successful.</Body>
    <Notice>Uninstalling the app removes its local journal. Export important sightings and keep a copy outside the app. Expo Go and a development build have separate storage; use export and restore to move your journal between them.</Notice>
    <Button title="Export journal with photographs" icon="share-outline" disabled={!ready || busy} onPress={exportJournal} />
    <Button title="Restore journal backup" icon="download-outline" variant="secondary" disabled={!ready || busy} onPress={restoreJournal} />
    <Body muted>Portable JSON backup, including images. Limit: 96 MB per backup, 24 MB per image, 5,000 sightings. Restore validates records and image paths before writing, decodes image files, and skips duplicate UUIDs. It never overwrites an existing sighting.</Body>
    {busy ? <Notice>Working on your journal. Please keep the app open until this finishes.</Notice> : null}
    {status ? <Notice>{status}</Notice> : null}{error ? <Notice error>{error}</Notice> : null}
    <Eyebrow>On this device</Eyebrow><Notice>{processingCapability().message}</Notice>
    <Body>Available: camera and import, private notes and optional location, offline sightings, editing, deletion, and journal backups.</Body>
    <Body muted>Planned: reviewed species identifications, regional encounter rarity, collections, and community features. Rarity is currently “Not assessed”. Conservation status, endemism, and encounter rarity will be separate concepts.</Body>
    <Body muted>Any future sharing must let you obscure sensitive wildlife and personal locations. Today no location is uploaded by this app. Export files include exact coordinates when present.</Body>
    {warnings.map(w => <Notice key={w}>{w}</Notice>)}
    <Button title="Retry image cleanup" variant="secondary" disabled={!ready || busy} onPress={() => void run(async () => { await cleanup(); setStatus('Cleanup retried. Any remaining problems are shown above.'); })} />
    <Body muted>Version 0.1.0 · Temporary name: {branding.name}</Body>
  </ScrollView></SafeAreaView>;
}
