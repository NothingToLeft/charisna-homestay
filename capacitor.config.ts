import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.charisna.kost',
  appName: 'CHARISNA KOST',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    minWebViewVersion: 100,
    backgroundColor: '#f4f7f5'
  }
};

export default config;
