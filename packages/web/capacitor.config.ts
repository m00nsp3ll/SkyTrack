import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skytrackyp.app',
  appName: 'SkyTrack Yp',
  webDir: 'out',
  server: {
    url: 'https://skytrackyp.com',
    cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    backgroundColor: '#2563eb'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563eb'
    }
  }
};

export default config;
