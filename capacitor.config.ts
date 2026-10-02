import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.curioplay.app',
  appName: 'CurioPlay',
  // Built by `npm run build:android` (relative asset paths). Deliberately NOT `dist`, which is the GitHub Pages build.
  webDir: 'dist-android'
};

export default config;
