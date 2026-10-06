import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { usePreventRemove, type NavigationAction } from 'expo-router/react-navigation';
import { messageOf, useJournal } from '../../src/ui/JournalProvider';
import { Button, Heading, Notice, Page, styles } from '../../src/ui/components';
import { formFields, initialForm, ObservationForm } from '../../src/ui/ObservationForm';

export default function Edit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { observations, journal, refresh } = useJournal();
  const item = observations.find(r => r.id === id);
  const navigation = useNavigation();
  const [initial] = useState(() => initialForm(null, item));
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const action = useRef<NavigationAction | null>(null);
  const lock = useRef(false);
  usePreventRemove((busy || locating || JSON.stringify(form) !== JSON.stringify(initial)) && !leaving, ({ data }) => {
    if (busy || locating) { Alert.alert('Finishing your changes', 'Wait for the save or location request to finish.'); return; }
    Alert.alert('Discard your changes?', 'Your saved sighting will stay as it was.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard changes', style: 'destructive', onPress: () => { action.current = data.action; setLeaving(true); } }]);
  });
  useEffect(() => { if (leaving) { if (action.current) navigation.dispatch(action.current); else router.back(); } }, [leaving, navigation]);
  const save = async () => {
    if (!item || !journal || lock.current || locating) return;
    lock.current = true; setBusy(true); setError(null);
    try {
      const fields = formFields(form);
      const preserveTaxon = fields.displayName === item.displayName && fields.category === item.category && item.identificationStatus === 'identified';
      await journal.update({ ...item, ...fields, identificationStatus: preserveTaxon ? 'identified' : fields.identificationStatus, taxonId: preserveTaxon ? item.taxonId : null, scientificName: preserveTaxon ? item.scientificName : null, identificationProvider: preserveTaxon ? item.identificationProvider : fields.identificationStatus === 'unverified' ? 'manual' : item.candidates.length ? 'apple-vision-clues' : 'none' });
      await refresh(); setLeaving(true);
    } catch (e) { setError(`Changes were not saved. ${messageOf(e)}`); }
    finally { setBusy(false); lock.current = false; }
  };
  if (!item) return <View style={styles.content}><Heading>Sighting unavailable</Heading><Button title="Open collection" onPress={() => router.replace('/')} /></View>;
  return <Page><Heading>Return to the moment.</Heading><ObservationForm form={form} onChange={setForm} disabled={busy} onLocationBusy={setLocating} />{error ? <Notice error>{error}</Notice> : null}<Button title={busy ? 'Saving changes…' : 'Save changes'} loading={busy} disabled={locating} onPress={() => void save()} /></Page>;
}
