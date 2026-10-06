import type { ExpoConfig } from 'expo/config';
import branding from './src/branding.json';

const config: ExpoConfig = {
  name: branding.name,
  slug: 'wildfolio',
  scheme: 'wildfolio',
  version: '0.1.0',
  icon: './assets/icon.png',
  orientation: 'default',
  userInterfaceStyle: 'light',
  // Travel builds boot their embedded bundle, with no OTA launch/update dependency.
  updates: { enabled: false },
  ios: { bundleIdentifier: 'com.wildfolio.journal', supportsTablet: true },
  android: { package: 'com.wildfolio.journal' },
  plugins: [
    'expo-router',
    'expo-sqlite',
    ['expo-image-picker', {
      photosPermission: 'Choose a nature photo for your private journal.',
      cameraPermission: 'Photograph a discovery for your private journal.',
      microphonePermission: false,
    }],
    ['expo-location', { locationWhenInUsePermission: 'Attach your current location only when you choose to. Locations stay in your private journal.' }],
  ],
  experiments: { typedRoutes: true },
};
export default config;
