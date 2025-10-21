export default () => {
  // Determina o ambiente baseado na variável EXPO_PUBLIC_ENVIRONMENT ou defaulta para 'development'
  const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
  const isDev = environment === 'development';
  
  // Configurações específicas por ambiente
  const envConfig = {
    development: {
      name: 'BusinessApp Dev',
      slug: 'businessapp-dev',
      bundleIdentifier: 'com.seuapp.business.dev',
      package: 'com.seuapp.business.dev',
      scheme: 'businessapp-dev',
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
        debugMode: process.env.EXPO_PUBLIC_DEBUG_MODE === 'true',
        apiTimeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || '5000'),
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
