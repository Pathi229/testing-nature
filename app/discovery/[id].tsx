import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { artworkPath, categoryNames } from '../../src/core/model';
import { imageUri } from '../../src/platform/storage';
import { messageOf, useJournal } from '../../src/ui/JournalProvider';
import { Body, Button, Eyebrow, Heading, Notice, Page, styles } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { observations, journal, refresh } = useJournal();
  const item = observations.find(r => r.id === id);
  const [original, setOriginal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = () => {
    if (busy || !item || !journal) return;
    Alert.alert('Delete this sighting?', 'The sighting and its photographs will be removed from this device. Export your journal first if you want a backup.', [
      { text: 'Keep sighting', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setBusy(true);
        void journal.delete(item.id).then(async warning => {
          await refresh(); if (warning) Alert.alert('Image cleanup pending', warning);
          router.replace('/');
        }).catch(e => { setError(messageOf(e)); setBusy(false); });
      } },
    ]);
  };
  if (!item) return <View style={styles.content}><Heading>Sighting unavailable</Heading><Body>This sighting may have been deleted, or the collection needs to refresh.</Body><Button title="Open collection" onPress={() => router.replace('/')} /></View>;
  return <Page>
    <Eyebrow>{categoryNames[item.category]} · private sighting</Eyebrow>
    <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}><Image source={{ uri: imageUri(original ? item.originalPath : artworkPath(item)) }} accessibilityLabel={original ? 'Original evidence photograph' : item.displayName} resizeMode="contain" style={{ width: '100%', aspectRatio: 1 }} /></View>
    {item.cutoutPath ? <Button title={original ? 'Show collection artwork' : 'Review original photo'} variant="secondary" onPress={() => setOriginal(v => !v)} /> : <Body muted>Original photograph · evidence retained</Body>}
    <Heading>{item.displayName}</Heading><Notice>{item.identificationStatus === 'unknown' ? 'Unknown identification. No species has been assigned.' : item.identificationStatus === 'unverified' ? 'Unverified name entered by you. It is not an expert or model identification.' : `Identified taxon: ${item.taxonId}`}</Notice>
    <View style={styles.card}><Row label="Observed" value={item.observedDate ?? 'Date unknown'} /><Row label="Place" value={[item.place, item.country].filter(Boolean).join(', ') || 'Place unknown'} /><Row label="Added to journal" value={new Date(item.createdAt).toLocaleDateString()} /><Row label="Photo source" value={item.source === 'camera' ? 'Camera' : 'Imported photo'} /><Row label="Rarity" value="Not assessed" /></View>
    {item.notes ? <><Eyebrow>Field notes</Eyebrow><Body>{item.notes}</Body></> : null}
    {item.coordinates ? <Notice>Private location · {item.coordinates.latitude.toFixed(5)}, {item.coordinates.longitude.toFixed(5)}{ '\n' }Attached at your request using the device’s current location. Accuracy {item.coordinates.accuracy === null ? 'unknown' : `about ${Math.round(item.coordinates.accuracy)} m`}. This may differ from where an imported photo was taken.</Notice> : null}
    {item.candidates.length ? <><Eyebrow>Possible image clues</Eyebrow><Body muted>{item.candidates.map(c => c.label.replaceAll('_', ' ')).join(' · ')}. General labels, not species identifications.</Body></> : null}
    {error ? <Notice error>{error}</Notice> : null}
    <Button title="Edit observation" icon="create-outline" disabled={busy} onPress={() => router.push({ pathname: '/edit/[id]', params: { id: item.id } })} />
    <Button title="Delete sighting" icon="trash-outline" variant="danger" loading={busy} onPress={remove} />
  </Page>;
}
function Row({ label, value }: { label: string; value: string }) { return <View style={{ gap: 5 }}><Text style={{ fontSize: 12, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase' }}>{label}</Text><Body>{value}</Body></View>; }
