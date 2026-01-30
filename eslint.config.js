// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "dist/*",
      "supabase/functions/**",
      "scripts/**",
      "assets/videos/ALTERNATIVA_VIDEO_WEB.js",
      "node_modules/**",
      ".expo/**",
      "build/**"
    ],
  }
]);
