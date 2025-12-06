const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };
  config.resolver = {
    ...resolver,
    assetExts: resolver.assetExts.filter((ext) => ext !== 'svg'),
    sourceExts: [...resolver.sourceExts, 'svg'],
    extraNodeModules: {
      '@lib': path.resolve(__dirname, 'lib'),
      '@components': path.resolve(__dirname, 'components'),
      '@contexts': path.resolve(__dirname, 'contexts'),
      '@utils': path.resolve(__dirname, 'utils'),
      '@services': path.resolve(__dirname, 'services'),
      '@types': path.resolve(__dirname, 'types')
    },
    unstable_enablePackageExports: true,
  };

  return config;
})(); 