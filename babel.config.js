module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    // react-native-worklets/plugin supersedes react-native-reanimated/plugin in
    // Reanimated 4 and must stay last in the plugin list.
    plugins: ['react-native-worklets/plugin'],
  };
};
