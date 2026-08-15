import { MMKV } from 'react-native-mmkv';
import { mmkvPlugin } from 'reactotron-plugin-mmkv';

// 1. Initialize two separate raw MMKV storage instances
export const rawBasicStorage = new MMKV({ id: 'reactotron-example-basic' });
export const rawProxyStorage = new MMKV({ id: 'reactotron-example-proxy' });

// 2. Wrap basic mode (uses change listener under the hood, returns raw MMKV instance)
const { plugin: basicPlugin, storage: basicStorage } = mmkvPlugin({
  storage: rawBasicStorage,
  mode: 'basic',
  stateNamespace: 'mmkvBasic',
});

// 3. Wrap proxy mode (uses JS Proxy wrapper for full method interception)
const { plugin: proxyPlugin, storage: proxyStorage } = mmkvPlugin({
  storage: rawProxyStorage,
  mode: 'proxy',
  logReads: true,
  logContains: true,
  stateNamespace: 'mmkvProxy',
});

// For backward compatibility and convenience, we export:
// - Both plugins
// - Both storages
export {
  basicPlugin,
  proxyPlugin,
  basicStorage,
  proxyStorage,
};
