const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const root = path.resolve(__dirname, '..');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    extraNodeModules: new Proxy(
      {},
      {
        get: (target, name) => {
          if (name === 'reactotron-plugin-mmkv') {
            return root;
          }
          // Redirect example's peer dependencies to local example node_modules
          return path.join(__dirname, 'node_modules', name);
        },
      }
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

