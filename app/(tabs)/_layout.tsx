import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors } from '../../src/ui/theme';
export default function TabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.forest, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.ivory, borderTopColor: colors.line }, tabBarLabelStyle: { fontSize: 12 }, animation: 'none' }}>
    <Tabs.Screen name="index" options={{ title: 'Collection', tabBarIcon: ({ color, size }) => <Ionicons name="leaf-outline" size={size} color={color} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Journal care', tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} /> }} />
  </Tabs>;
}
