module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-native-worklets/plugin powers reanimated 4 and MUST be listed last.
    plugins: ["react-native-worklets/plugin"],
  };
};
