/// <reference types="@capawesome/capacitor-live-update" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.schooldashboard.app',
  appName: 'School Dashboard',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LiveUpdate: {
      readyTimeout: 10000,
      autoDeleteBundles: true,
    },
  },
};

export default config;
