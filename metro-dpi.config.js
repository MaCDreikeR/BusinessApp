// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // [Web-only]: Enables CSS support in Metro.
  isCSSEnabled: true,
});

// Adiciona transformação específica para correção de DPI
config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('./dpi-transformer.js'),
};

module.exports = config;