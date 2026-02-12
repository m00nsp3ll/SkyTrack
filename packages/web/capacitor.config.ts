import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skytrackyp.app',
  appName: 'SkyTrack Yp',
  webDir: 'out',
  server: {
    url: 'https://skytrackyp.com',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2563eb',
      showSpinner: false
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#2563eb'
    }
  }
};

export default config;
