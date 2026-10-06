import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { router } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { acquire, newRequestId, prepare } from '../src/platform/capture';
import { vision } from '../modules/wildfolio-vision';
import { processingCapability } from '../src/platform/identification';
import { messageOf, useJournal } from '../src/ui/JournalProvider';
import { Body, Button, Eyebrow, Heading, Notice, Page, styles } from '../src/ui/components';

export default function Capture() {
  const { setDraft, ready } = useJournal();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const active = useRef<{ controller: AbortController; id: string } | null>(null);
  const locked = useRef(false);
  usePreventRemove(busy, () => Alert.alert('Processing a discovery', 'Use Cancel processing before leaving this screen.'));
  const cancel = () => { active.current?.controller.abort(); if (active.current) vision?.cancel(active.current.id); setProgress('Cancelling processing…'); };
  useEffect(() => () => { active.current?.controller.abort(); if (active.current) vision?.cancel(active.current.id); }, []);
  const choose = async (source: 'camera' | 'import') => {
    if (locked.current || !ready) return;
    locked.current = true; setBusy(true); setError(null); setProgress('Opening the camera or photo picker…');
    const job = { controller: new AbortController(), id: newRequestId() }; active.current = job;
    try {
      const image = await acquire(source);
      if (!image || job.controller.signal.aborted) return;
      const draft = await prepare(image, source, setProgress, job.controller.signal, job.id);
      setDraft(draft);
      // Navigate after the prevent-remove hook has been disabled by the next render.
      setNext(true);
    } catch (e) { if (!job.controller.signal.aborted) setError(messageOf(e)); }
    finally { setBusy(false); active.current = null; locked.current = false; }
  };
  const [next, setNext] = useState(false);
  useEffect(() => { if (next && !busy) router.replace('/review'); }, [next, busy]);
  return <Page>
    <Eyebrow>Pause · observe · remember</Eyebrow><Heading>What caught your eye?</Heading><Body muted>Start with a real photograph. You can review the image, add travel notes, and save even if no subject or image clue is found.</Body>
    <View style={styles.card}><Button title="Take a photograph" icon="camera-outline" disabled={busy || !ready} onPress={() => void choose('camera')} /><Button title="Import a photograph" icon="images-outline" variant="secondary" disabled={busy || !ready} onPress={() => void choose('import')} /><Body muted>The camera asks for access when opened. The system photo picker shares only the image you select.</Body></View>
    <Notice>{processingCapability().message}</Notice>
    {busy ? <><Button title={progress} loading onPress={() => {}} /><Button title="Cancel processing" variant="secondary" onPress={cancel} /></> : null}
    {error ? <Notice error>{error}</Notice> : null}
    <Body muted>Keep a respectful distance from wildlife. A sighting belongs in your journal; the wild stays wild.</Body>
  </Page>;
}
