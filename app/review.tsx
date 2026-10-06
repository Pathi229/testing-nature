import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { discardDraft } from '../src/platform/storage';
import { messageOf, useJournal } from '../src/ui/JournalProvider';
import { Body, Button, Eyebrow, Heading, Notice, Page, styles } from '../src/ui/components';
import { formFields, initialForm, ObservationForm } from '../src/ui/ObservationForm';
import { colors } from '../src/ui/theme';

export default function Review() {
  const { draft, setDraft, journal, refresh } = useJournal();
  const navigation = useNavigation();
  const [form, setForm] = useState(() => initialForm(draft?.observedDate ?? null));
  const [selected, setSelected] = useState(0);
  const [artwork, setArtwork] = useState<'original' | 'cutout'>(draft?.cutouts.length ? 'cutout' : 'original');
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const pendingAction = useRef<NavigationAction | null>(null);
  const lock = useRef(false);
  usePreventRemove(!!draft && !leaving, ({ data }) => {
    if (busy || locating) { Alert.alert('Finishing your sighting', 'Please wait until the save or location request finishes.'); return; }
    Alert.alert('Discard this unsaved discovery?', 'Your photograph and notes have not been saved to the collection.', [
      { text: 'Keep reviewing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { pendingAction.current = data.action; setLeaving(true); } },
    ]);
  });
  useEffect(() => {
    if (!leaving) return;
    if (savedId) { router.replace({ pathname: '/discovery/[id]', params: { id: savedId } }); return; }
    if (pendingAction.current) {
      if (draft) void discardDraft(draft.id).catch(() => {});
      setDraft(null);
      navigation.dispatch(pendingAction.current);
      pendingAction.current = null;
    }
  }, [leaving, savedId, draft, setDraft, navigation]);
  const save = async () => {
    if (!draft || !journal || lock.current || locating) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const cutout = draft.cutouts[selected]?.uri ?? null;
      const item = await journal.save({ id: draft.id, ...formFields(form), taxonId: null, scientificName: null, identificationProvider: form.name.trim() ? 'manual' : draft.provider, candidates: draft.candidates, createdAt: new Date().toISOString(), source: draft.source, artwork: cutout ? artwork : 'original' }, draft.originalUri, cutout);
      await refresh();
      setDraft(null);
      // A cleanup failure must never turn a committed observation into a reported save failure.
      void discardDraft(draft.id).catch(() => {});
      setSavedId(item.id); setLeaving(true);
    } catch (e) { setError(`Could not save. Your draft is still here; retry after freeing space or fixing the error. ${messageOf(e)}`); }
    finally { setBusy(false); lock.current = false; }
  };
  if (!draft) return <View style={styles.content}><Heading>{savedId ? 'Sighting saved' : 'No unsaved discovery'}</Heading><Button title="Open collection" onPress={() => router.replace('/')} /></View>;
  const cutout = draft.cutouts[selected];
  return <Page>
    <Eyebrow>A page for your discovery</Eyebrow><Heading>Make it yours.</Heading>
    <View style={[styles.card, { padding: 0, overflow: 'hidden' }]}><Image source={{ uri: artwork === 'cutout' && cutout ? cutout.uri : draft.originalUri }} accessibilityLabel="Selected discovery artwork" resizeMode="contain" style={{ width: '100%', aspectRatio: 1 }} /></View>
    {draft.cutouts.length ? <>
      <View style={styles.row}><Button title="Original photo" variant={artwork === 'original' ? 'primary' : 'secondary'} disabled={busy} onPress={() => setArtwork('original')} /><Button title="Subject cutout" variant={artwork === 'cutout' ? 'primary' : 'secondary'} disabled={busy} onPress={() => setArtwork('cutout')} /></View>
      <Body muted>Select a foreground subject. Review the edges; save the original if the cutout misses important details.</Body>
      <View style={styles.row}>{draft.cutouts.map((c, index) => <Button key={c.instanceId} title={`Subject ${index + 1}`} variant={selected === index ? 'primary' : 'secondary'} disabled={busy} onPress={() => { setSelected(index); setArtwork('cutout'); }} />)}</View>
    </> : null}
    <Text accessibilityRole="header" style={{ color: colors.forest, fontSize: 21, fontFamily: 'Georgia' }}>Possible image clues</Text>
    {draft.candidates.length ? <Notice>{draft.candidates.map(c => c.label.replaceAll('_', ' ')).join(' · ')}{ '\n\n' }General labels ordered by model score. They do not establish a species or guarantee accuracy.</Notice> : <Body muted>No image clues available. An unknown discovery is welcome in your journal.</Body>}
    {draft.messages.map((m, i) => <Notice key={i}>{m}</Notice>)}
    <ObservationForm form={form} onChange={setForm} disabled={busy} onLocationBusy={setLocating} />
    {error ? <Notice error>{error}</Notice> : null}
    <Button title={busy ? 'Saving your sighting…' : 'Save a sighting'} loading={busy} disabled={locating} icon="bookmark-outline" onPress={() => void save()} />
    <Body muted>Saved privately on this device. Unsaved drafts are kept on this screen after a failed save, but are not retained after closing the app.</Body>
  </Page>;
}
