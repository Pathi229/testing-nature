import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from './theme';

export function Heading({ children }: { children: ReactNode }) { return <Text accessibilityRole="header" style={styles.heading}>{children}</Text>; }
export function Page({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <ScrollView style={styles.page} keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingLeft: Math.max(22, insets.left + 12), paddingRight: Math.max(22, insets.right + 12), paddingBottom: 40 + insets.bottom }]}>{children}</ScrollView>;
}
export function Body({ children, muted = false }: { children: ReactNode; muted?: boolean }) { return <Text style={[styles.body, muted && { color: colors.muted }]}>{children}</Text>; }
export function Eyebrow({ children }: { children: ReactNode }) { return <Text style={styles.eyebrow}>{children}</Text>; }
export function Button({ title, onPress, variant = 'primary', disabled = false, loading = false, icon }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  const foreground = variant === 'primary' ? colors.white : variant === 'danger' ? colors.danger : colors.forest;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: disabled || loading, busy: loading }} onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [styles.button, variant !== 'primary' && styles.secondary, (pressed || disabled || loading) && { opacity: 0.65 }]}>
    {loading ? <ActivityIndicator color={foreground} /> : icon ? <Ionicons name={icon} size={21} color={foreground} /> : null}
    <Text style={[styles.buttonText, { color: foreground }]}>{title}</Text>
  </Pressable>;
}
export function Notice({ children, error = false }: { children: ReactNode; error?: boolean }) {
  return <View accessibilityLiveRegion="polite" style={[styles.notice, error && { backgroundColor: '#F8E8DF' }]}><Text style={[styles.noticeText, error && { color: colors.danger }]}>{children}</Text></View>;
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 8 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} style={[styles.input, props.multiline && { minHeight: 110, textAlignVertical: 'top' }]} {...props} /></View>;
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.ivory },
  content: { padding: 22, gap: 20, paddingBottom: 40 },
  heading: { fontFamily: 'Georgia', fontSize: 34, lineHeight: 42, color: colors.forest },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  eyebrow: { fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', color: colors.clay },
  button: { minHeight: 52, borderRadius: 16, backgroundColor: colors.forest, paddingVertical: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { fontSize: 16, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  secondary: { backgroundColor: colors.sage, borderWidth: 1, borderColor: colors.line },
  notice: { padding: 16, borderRadius: 16, backgroundColor: colors.sage },
  noticeText: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  label: { color: colors.forest, fontSize: 15, fontWeight: '600' },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, color: colors.ink, padding: 14, fontSize: 16, minHeight: 52 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  card: { borderRadius: 24, padding: 20, gap: 14, backgroundColor: colors.sage },
});
