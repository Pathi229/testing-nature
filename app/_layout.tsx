import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { JournalProvider } from '../src/ui/JournalProvider';
import { colors } from '../src/ui/theme';

export { ErrorBoundary } from 'expo-router';
export default function Layout() {
  return <SafeAreaProvider><JournalProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.ivory }, headerTintColor: colors.forest, contentStyle: { backgroundColor: colors.ivory }, animation: 'none' }}>
    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    <Stack.Screen name="capture" options={{ title: 'Discover', gestureEnabled: false }} />
    <Stack.Screen name="review" options={{ title: 'Review discovery', gestureEnabled: false }} />
    <Stack.Screen name="discovery/[id]" options={{ title: 'Your sighting' }} />
    <Stack.Screen name="edit/[id]" options={{ title: 'Edit observation', gestureEnabled: false }} />
  </Stack></JournalProvider></SafeAreaProvider>;
}
