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
      // Supabase
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      // Push Notifications
      expoProjectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID || 'a2c63467-c52f-447e-9973-63d2a6d62043',
      // APIs Externas
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      whatsappBusinessApiKey: process.env.EXPO_PUBLIC_WHATSAPP_API_KEY,
      whatsappBusinessPhoneId: process.env.EXPO_PUBLIC_WHATSAPP_PHONE_ID,
      // App Configuration
      appName: process.env.EXPO_PUBLIC_APP_NAME || 'BusinessApp',
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0',
      appEnvironment: process.env.EXPO_PUBLIC_APP_ENV || 'development',
      apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '30000', 10),
      enableDebugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
      // Feature Flags
      enablePushNotifications: process.env.EXPO_PUBLIC_ENABLE_PUSH !== 'false',
      enableWhatsappIntegration: process.env.EXPO_PUBLIC_ENABLE_WHATSAPP === 'true',
      enableAnalytics: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true',
      // Security
      maxLoginAttempts: parseInt(process.env.EXPO_PUBLIC_MAX_LOGIN_ATTEMPTS || '5', 10),
      sessionTimeout: parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT || '3600000', 10),
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
