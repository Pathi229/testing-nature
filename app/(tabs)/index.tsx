import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { branding } from '../../src/branding';
import { artworkPath, categories, categoryNames, type Category } from '../../src/core/model';
import { imageUri } from '../../src/platform/storage';
import { useJournal } from '../../src/ui/JournalProvider';
import { Body, Button, Eyebrow, Heading, Notice, styles } from '../../src/ui/components';
import { colors } from '../../src/ui/theme';

export default function Collection() {
  const { observations, ready, error, retry, draft, warnings } = useJournal();
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [query, setQuery] = useState('');
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 350 || fontScale > 1.25 ? 1 : width > 750 ? 3 : 2;
  const filtered = useMemo(() => observations.filter(r => (category === 'all' || r.category === category) && `${r.displayName} ${r.place} ${r.country}`.toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [observations, category, query]);
  const taxa = new Set(observations.filter(r => r.taxonId !== null && r.identificationStatus === 'identified').map(r => r.taxonId));
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.page}>
    <FlatList key={columns} numColumns={columns} data={filtered} keyExtractor={item => item.id} contentContainerStyle={{ padding: 22, paddingBottom: 36, gap: 14 }} columnWrapperStyle={columns > 1 ? { gap: 14 } : undefined}
      ListHeaderComponent={<View style={{ gap: 18, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Eyebrow>{branding.name} · field journal</Eyebrow><Ionicons name="leaf-outline" color={colors.forest} size={28} /></View>
        <Heading>{branding.tagline}</Heading>
        <Body muted>Small wonders. Lasting memories.{ '\n' }Keep the nature you notice along the way.</Body>
        <View style={{ paddingVertical: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, gap: 5 }}><Text style={{ color: colors.forest, fontSize: 25, fontFamily: 'Georgia' }}>{observations.length} {observations.length === 1 ? 'sighting' : 'sightings'}</Text>{taxa.size ? <Body muted>{taxa.size} unique identified {taxa.size === 1 ? 'species' : 'species'}</Body> : <Body muted>Your private collection, growing at your pace.</Body>}</View>
        {!ready && !error ? <ActivityIndicator color={colors.forest} accessibilityLabel="Opening your journal" /> : null}
        {error ? <><Notice error>{error}</Notice><Button title="Retry opening journal" variant="secondary" onPress={retry} /></> : null}
        {warnings.map(w => <Notice key={w}>{w}</Notice>)}
        {draft ? <Button title="Resume unsaved discovery" variant="secondary" onPress={() => router.push('/review')} /> : null}
        <Button title="Add discovery" icon="add-outline" disabled={!ready} onPress={() => router.push(draft ? '/review' : '/capture')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 14 }}><Ionicons name="search-outline" size={20} color={colors.muted} /><TextInput accessibilityLabel="Search sightings by name or place" value={query} onChangeText={setQuery} placeholder="Search name or place" placeholderTextColor={colors.muted} style={{ flex: 1, minHeight: 52, padding: 12, fontSize: 16, color: colors.ink }} /></View>
        <View style={styles.row}>{(['all', ...categories] as const).map(c => <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: category === c }} onPress={() => setCategory(c)} style={{ borderRadius: 24, paddingHorizontal: 16, paddingVertical: 14, minHeight: 48, backgroundColor: category === c ? colors.forest : colors.sage }}><Text style={{ color: category === c ? colors.white : colors.forest, fontSize: 15 }}>{c === 'all' ? 'All' : categoryNames[c]}</Text></Pressable>)}</View>
      </View>}
      ListEmptyComponent={ready ? <View style={[styles.card, { alignItems: 'center', paddingVertical: 36 }]}><Ionicons name="sunny-outline" size={58} color={colors.clay} /><Text style={{ color: colors.forest, fontFamily: 'Georgia', fontSize: 24, textAlign: 'center' }}>{observations.length ? 'No sightings match yet' : 'Begin with a moment of wonder'}</Text><Body muted>{observations.length ? 'Try another name, place, or category.' : 'A bird on a branch. A flower by the trail. Photograph or import your first discovery.'}</Body></View> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`${item.displayName}, ${item.observedDate ?? 'date unknown'}, ${item.place || 'place unknown'}, ${item.identificationStatus}`} onPress={() => router.push({ pathname: '/discovery/[id]', params: { id: item.id } })} style={({ pressed }) => ({ flex: 1, maxWidth: columns > 1 ? `${100 / columns}%` : '100%', backgroundColor: colors.sage, borderRadius: 22, overflow: 'hidden', opacity: pressed ? 0.75 : 1 })}>
        <Image source={{ uri: imageUri(artworkPath(item)) }} accessibilityLabel={item.displayName} style={{ width: '100%', aspectRatio: 0.95, backgroundColor: colors.sage }} resizeMode={item.artwork === 'cutout' ? 'contain' : 'cover'} />
        <View style={{ padding: 14, gap: 7 }}><Text style={{ color: colors.forest, fontSize: 19, fontFamily: 'Georgia' }}>{item.displayName}</Text><Text style={{ color: colors.clay, fontSize: 12, fontWeight: '600' }}>{item.identificationStatus === 'unknown' ? 'Awaiting a name' : item.identificationStatus === 'unverified' ? 'Name unverified' : 'Identified'}</Text><Text style={{ color: colors.muted, fontSize: 13, lineHeight: 19 }}>{item.observedDate ?? 'Date unknown'}{ '\n' }{[item.place, item.country].filter(Boolean).join(', ') || 'Place unknown'}</Text></View>
      </Pressable>} />
  </SafeAreaView>;
}
