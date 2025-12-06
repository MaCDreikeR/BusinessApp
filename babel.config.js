module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@lib': './lib',
            '@components': './components',
            '@contexts': './contexts',
            '@utils': './utils',
            '@services': './services',
            '@types': './types'
          }
        }
      ]
    ]
  };
}; 