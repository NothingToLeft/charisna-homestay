import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.charisna.homestay',
  appName: 'Charisna Homestay',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#f4f7f5'
  }
};

export default config;
