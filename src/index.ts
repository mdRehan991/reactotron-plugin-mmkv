/**
 * reactotron-plugin-mmkv
 *
 * Full-featured Reactotron plugin for react-native-mmkv.
 * - Timeline logging for all MMKV operations (SET, UPDATE, GET, DELETE, CLEAR_ALL)
 * - State tab integration to browse MMKV data alongside Redux state
 */

export { mmkvPlugin } from './mmkv-plugin';
export { type MmkvPluginResult } from './mmkv-plugin';
export { type MmkvPluginConfig, type MMKVInstance } from './utils';

// Default export for convenience
import { mmkvPlugin } from './mmkv-plugin';
export default mmkvPlugin;
