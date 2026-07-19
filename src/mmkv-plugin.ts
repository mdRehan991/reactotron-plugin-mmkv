/**
 * Main plugin factory for reactotron-plugin-mmkv.
 *
 * Combines:
 * 1. Proxy-based timeline logging (proxy-handler)
 * 2. State tab integration (state-handler)
 *
 * Returns a Reactotron plugin and a proxied MMKV instance.
 */

import {
  type MmkvPluginConfig,
  type MMKVInstance,
  type ReactotronPluginInstance,
} from './utils';
import { createProxiedStorage } from './proxy-handler';
import { createStateHandler } from './state-handler';

/** What mmkvPlugin() returns. */
export interface MmkvPluginResult<T = ArrayBuffer | Uint8Array> {
  /**
   * The Reactotron plugin — pass to `Reactotron.use(plugin)`.
   */
  plugin: (reactotron: ReactotronPluginInstance) => {
    onConnect: () => void;
    onDisconnect: () => void;
    onCommand: (cmd: { type: string; payload?: { path?: string | null; paths?: string[] } }) => void;
    features: {
      mmkvGetState: () => Record<string, unknown>;
      mmkvGetKeys: () => string[];
    };
  };

  /**
   * The proxied MMKV instance — use this throughout your app.
   * All operations are intercepted and logged to Reactotron.
   */
  storage: MMKVInstance<T>;
}

/**
 * Create a full-featured Reactotron plugin for react-native-mmkv.
 *
 * @example
 * ```ts
 * import { mmkvPlugin } from 'reactotron-plugin-mmkv';
 * import { MMKV } from 'react-native-mmkv';
 *
 * const rawStorage = new MMKV();
 * const { plugin, storage } = mmkvPlugin({ storage: rawStorage });
 *
 * Reactotron.use(plugin).connect();
 * export { storage as LocalStorage };
 * ```
 */
export function mmkvPlugin<T = ArrayBuffer | Uint8Array>(
  config: MmkvPluginConfig<T>
): MmkvPluginResult<T> {
  const {
    storage: rawStorage,
    ignore = [],
    logReads = false,
    logContains = false,
    stateNamespace = 'mmkv',
  } = config;

  // Mutable ref to the connected Reactotron instance
  let reactotronRef: ReactotronPluginInstance | null = null;
  const getReactotron = () => reactotronRef;

  // --- Proxy handler (timeline logging) ---
  const proxiedStorage = createProxiedStorage(
    rawStorage,
    { ignore, logReads, logContains },
    getReactotron
  );

  // --- State handler (State tab browsing) ---
  const stateHandler = createStateHandler(
    { namespace: stateNamespace, storage: rawStorage },
    getReactotron
  );

  // --- Reactotron plugin interface ---
  const plugin = (reactotron: ReactotronPluginInstance) => ({
    onConnect() {
      reactotronRef = reactotron;

      stateHandler.setupMonkeyPatch(reactotron);

      // Start listening for MMKV changes (for State tab subscriptions)
      stateHandler.startSubscriptions();

      reactotron.display({
        name: 'MMKV',
        value: {
          message: 'MMKV plugin connected — logging storage operations',
          config: {
            logReads,
            logContains,
            ignoredKeys: ignore,
            stateNamespace,
          },
          currentKeys: rawStorage.getAllKeys(),
        },
        preview: '✅ MMKV plugin connected',
        important: true,
      });
    },

    onDisconnect() {
      stateHandler.restoreMonkeyPatch(reactotronRef);
      stateHandler.stopSubscriptions();
      reactotronRef = null;
    },

    onCommand(cmd: { type: string; payload?: { path?: string | null; paths?: string[] } }) {
      stateHandler.onCommand(cmd);
    },

    features: {
      /**
       * Get the full MMKV state as an object.
       * Available as `Reactotron.mmkvGetState()` after plugin registration.
       */
      mmkvGetState: () => {
        return stateHandler._getFullState();
      },

      /**
       * Get the list of all MMKV keys.
       * Available as `Reactotron.mmkvGetKeys()` after plugin registration.
       */
      mmkvGetKeys: () => {
        return rawStorage.getAllKeys();
      },
    },
  });

  return { plugin, storage: proxiedStorage };
}
