export default () => {
  // Determina o ambiente baseado na variável EXPO_PUBLIC_ENVIRONMENT
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'local';
  const isDev = environment === 'local' || environment === 'staging';
  
  // Configurações específicas por ambiente
  const envConfig = {
    local: {
      name: 'BusinessApp Local',
      slug: 'businessapp-local',
      bundleIdentifier: 'com.seuapp.business.local',
      package: 'com.seuapp.business.local',
      scheme: 'businessapp-local',
    },
    staging: {
      name: 'BusinessApp Staging',
      slug: 'businessapp-staging', 
      bundleIdentifier: 'com.seuapp.business.staging',
      package: 'com.seuapp.business.staging',
      scheme: 'businessapp-staging',
    },
    production: {
      name: 'BusinessApp',
      slug: 'businessapp',
      bundleIdentifier: 'com.seuapp.business',
      package: 'com.seuapp.business',
      scheme: 'businessapp',
    }
  };

  const config = envConfig[environment];

  return {
    expo: {
      name: config.name,
      slug: config.slug,
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/images/icon.png',
      userInterfaceStyle: 'light',
      splash: {
        image: './assets/images/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffffff',
      },
      assetBundlePatterns: ['**/*'],
      ios: {
        supportsTablet: true,
        bundleIdentifier: config.bundleIdentifier,
        infoPlist: {
          UIBackgroundModes: ['remote-notification'],
        },
        newArchEnabled: true,
      },
      android: {
        supportsTablet: true,
        adaptiveIcon: {
          foregroundImage: './assets/images/adaptive-icon.png',
          backgroundColor: '#ffffffff',
        },
        package: config.package,
        permissions: ['NOTIFICATIONS'],
        newArchEnabled: true,
      },
      web: {
        favicon: './assets/images/favicon.png',
      },
      extra: {
        eas: {
          projectId: 'a2c63467-c52f-447e-9973-63d2a6d62043',
        },
        environment,
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        useLocalDb: process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true',
        debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
        apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '5000'),
        offlineMode: process.env.EXPO_PUBLIC_OFFLINE_MODE === 'true',
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
      scheme: config.scheme,
      experiments: {
        tsconfigPaths: true,
        typedRoutes: true,
      },
    },
  };
};
