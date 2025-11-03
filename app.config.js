export default {
  expo: {
    name: 'BusinessApp',
    slug: 'businessapp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: 'assets/images/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: 'assets/images/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffffff',
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
        foregroundImage: 'assets/images/adaptive-icon.png',
        backgroundColor: '#ffffffff', // Azul da loja (ajuste conforme sua imagem)
      },
      package: 'com.macdreiker.business',
      permissions: ['NOTIFICATIONS'],
      newArchEnabled: true,
    },
    web: {
      bundler: "metro",
      output: "static", 
      favicon: 'assets/images/favicon.png', // Mantenha este
      manifest: {
        name: "BusinessApp - Gestão Completa",
        short_name: "BusinessApp",
        description: "Sistema completo de gestão para seu negócio",
        theme_color: "#8B5CF6",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        categories: ["business", "productivity", "finance"],
      },
      meta: {
        "apple-mobile-web-app-capable": "yes",
        "apple-mobile-web-app-status-bar-style": "default",
        "apple-mobile-web-app-title": "BusinessApp",
        "mobile-web-app-capable": "yes",
        "theme-color": "#8B5CF6"
      }
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
          icon: 'assets/images/icon.png',
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
