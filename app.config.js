export default {
  expo: {
    name: 'BusinessApp',
    slug: 'businessapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.macdreiker.business',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
      },
      newArchEnabled: true,
    },
    android: {
      supportsTablet: true,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.macdreiker.business',
      permissions: ['NOTIFICATIONS'],
      newArchEnabled: true,
    },
    extra: {
      eas: {
        projectId: 'a2c63467-c52f-447e-9973-63d2a6d62043',
      },
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-secure-store',
      'expo-sqlite',
      'expo-web-browser',
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#7C3AED',
          sounds: [],
        },
      ],
    ],
    scheme: 'businessapp',
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true,
    },
  },
  updates: {
  url: "https://u.expo.dev/a2c63467-c52f-447e-9973-63d2a6d62043"
},
runtimeVersion: {
  policy: "appVersion"
},
};
