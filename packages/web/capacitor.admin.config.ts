import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.skytrackyp.admin',
  appName: 'SkyTrack Admin',
  webDir: 'out',
  server: {
    url: 'https://skytrackyp.com/admin',
    cleartext: true,
    androidScheme: 'https',
    iosScheme: 'https'
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    backgroundColor: '#1e3a5f',
    path: 'ios-admin'
  },
  plugins: {
    StatusBar: {
      style: 'light',
      backgroundColor: '#1e3a5f'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e3a5f',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
      iosSpinnerStyle: 'small',
      spinnerColor: '#ffffff'
    }
  }
};

export default config;
