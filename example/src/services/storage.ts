import { MMKV } from 'react-native-mmkv';
import { mmkvPlugin } from 'reactotron-plugin-mmkv';

// 1. Initialize the raw MMKV storage instance
export const rawStorage = new MMKV({ id: 'reactotron-example' });

// 2. Wrap it with the mmkvPlugin. We enable logReads and logContains to show
// how the plugin logs ALL operations, not just writes.
const { plugin, storage } = mmkvPlugin({
  storage: rawStorage,
  logReads: true,
  logContains: true,
  stateNamespace: 'mmkvStore',
});

export { plugin as mmkvReactotronPlugin, storage };
