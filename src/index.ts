/**
 * reactotron-plugin-mmkv
 *
 * Full-featured Reactotron plugin for react-native-mmkv.
 * - Timeline logging for all MMKV operations (SET, UPDATE, GET, DELETE, CLEAR_ALL)
 * - State tab integration to browse MMKV data alongside Redux state
 */

export { mmkvPlugin, type MmkvPluginResult } from './mmkv-plugin';
export { createProxiedStorage, type ProxyHandlerConfig } from './proxy-handler';
export { createStateHandler, type StateHandlerConfig } from './state-handler';
export {
  type MmkvPluginConfig,
  type MMKVInstance,
  type OperationType,
  type ReactotronPluginInstance,
  OPERATION,
  EMOJI,
  truncate,
  type FormatValueOptions,
  formatValueForState,
  parseJsonSafe,
  readValue,
  readRawValue,
} from './utils';

// Default export for convenience
import { mmkvPlugin } from './mmkv-plugin';
export default mmkvPlugin;
