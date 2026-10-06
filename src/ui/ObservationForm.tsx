import { Pressable, Text, View } from 'react-native';
import { colors } from './theme';
import { Body, Button, Field, Notice, styles } from './components';
import { categories, categoryNames, isDate, nameAndStatus, type Category, type Observation } from '../core/model';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { messageOf } from './JournalProvider';

export type Form = { category: Category; name: string; observedDate: string; place: string; country: string; notes: string; coordinates: Observation['coordinates']; locationProvenance: Observation['locationProvenance'] };
export function initialForm(observedDate: string | null, item?: Observation): Form {
  return { category: item?.category ?? 'animal', name: item && item.identificationStatus !== 'unknown' ? item.displayName : '', observedDate: item?.observedDate ?? observedDate ?? '', place: item?.place ?? '', country: item?.country ?? '', notes: item?.notes ?? '', coordinates: item?.coordinates ?? null, locationProvenance: item?.locationProvenance ?? 'none' };
}
export function formFields(form: Form) {
  if (form.observedDate && !isDate(form.observedDate)) throw new Error('Enter a real date as YYYY-MM-DD, or leave it blank if unknown.');
  return { ...nameAndStatus(form.name, form.category), category: form.category, observedDate: form.observedDate || null, place: form.place.trim(), country: form.country.trim(), notes: form.notes.trim(), coordinates: form.coordinates, locationProvenance: form.locationProvenance };
}
export function ObservationForm({ form, onChange, disabled, onLocationBusy }: { form: Form; onChange: (form: Form) => void; disabled: boolean; onLocationBusy?: (busy: boolean) => void }) {
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const update = <K extends keyof Form>(key: K, value: Form[K]) => onChange({ ...formRef.current, [key]: value });
  const attach = async () => {
    setLocating(true); onLocationBusy?.(true); setError(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) throw new Error('Location permission denied. Enter a place manually, or enable access in iPhone Settings.');
      if (!(await Location.hasServicesEnabledAsync())) throw new Error('Device location services are disabled. You can enter a place manually.');
      const value = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Location timed out. Try outside or enter a place manually.')), 20000); }),
      ]);
      onChange({ ...formRef.current, coordinates: { latitude: value.coords.latitude, longitude: value.coords.longitude, accuracy: value.coords.accuracy }, locationProvenance: 'device-at-user-request' });
    } catch (e) { setError(messageOf(e)); }
    finally { if (timer) clearTimeout(timer); setLocating(false); onLocationBusy?.(false); }
  };
  return <View style={{ gap: 20 }}>
    <Text style={styles.label}>What did you observe?</Text>
    <View style={styles.row}>{categories.map(category => <Pressable key={category} accessibilityRole="button" accessibilityState={{ selected: form.category === category, disabled }} disabled={disabled} onPress={() => update('category', category)} style={{ minHeight: 48, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 24, backgroundColor: category === form.category ? colors.forest : colors.sage }}><Text style={{ fontSize: 15, color: category === form.category ? colors.white : colors.forest }}>{categoryNames[category]}</Text></Pressable>)}</View>
    <Field label="Display name (optional, unverified)" value={form.name} onChangeText={v => update('name', v)} maxLength={120} placeholder={`Unknown ${form.category}`} editable={!disabled} />
    <Field label="Observed date (YYYY-MM-DD, or blank if unknown)" value={form.observedDate} onChangeText={v => update('observedDate', v)} maxLength={10} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" editable={!disabled} />
    <Field label="Place" value={form.place} onChangeText={v => update('place', v)} maxLength={200} placeholder="Trail, garden, or town" editable={!disabled} />
    <Field label="Country" value={form.country} onChangeText={v => update('country', v)} maxLength={100} placeholder="Where was this discovery?" editable={!disabled} />
    <Field label="Field notes" value={form.notes} onChangeText={v => update('notes', v)} maxLength={4000} placeholder="What made you pause?" multiline editable={!disabled} />
    <Body muted>Location is private and optional. For older travel photos, enter a place manually. Attaching location below uses where you are now.</Body>
    {form.coordinates ? <Notice>Current device location attached at your request. Accuracy: {form.coordinates.accuracy === null ? 'unknown' : `about ${Math.round(form.coordinates.accuracy)} m`}.</Notice> : null}
    <Button title={form.coordinates ? 'Remove private location' : 'Attach current private location'} icon="location-outline" variant="secondary" disabled={disabled} loading={locating} onPress={() => { if (form.coordinates) onChange({ ...form, coordinates: null, locationProvenance: 'none' }); else void attach(); }} />
    {error ? <Notice error>{error}</Notice> : null}
  </View>;
}
