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
  readValue,
  truncate,
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
   * The proxied or raw MMKV instance — use this throughout your app.
   * - In 'proxy' mode: intercepts all operations and logs them to Reactotron.
   * - In 'basic' mode: returns the original raw instance directly.
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
    mode = 'proxy',
    ignore = [],
    logReads = false,
    logContains = false,
    stateNamespace = 'mmkv',
  } = config;

  // Mutable ref to the connected Reactotron instance
  let reactotronRef: ReactotronPluginInstance | null = null;
  const getReactotron = () => reactotronRef;

  // Track the change listener for timeline logging in 'listener' mode
  let timelineListener: { remove: () => void } | null = null;

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

      // Hook up timeline logging via listener if in basic mode
      if (mode === 'basic') {
        timelineListener = rawStorage.addOnValueChangedListener((changedKey: string) => {
          if (ignore.includes(changedKey)) return;

          const exists = rawStorage.contains(changedKey);
          if (exists) {
            const value = readValue(rawStorage, changedKey);
            const valueDisplay = truncate(value);
            reactotron.display({
              name: 'MMKV',
              value: { operation: 'SET', key: changedKey, value },
              preview: `🟢 MMKV SET  "${changedKey}"  →  ${valueDisplay}`,
              important: true,
            });
            if ((reactotron as any).stateActionComplete) {
              (reactotron as any).stateActionComplete('MMKV SET', { key: changedKey, value });
            } else if (reactotron.send) {
              reactotron.send('state.action.complete', { name: 'MMKV SET', action: { key: changedKey, value } });
            }
          } else {
            reactotron.display({
              name: 'MMKV',
              value: { operation: 'DELETE', key: changedKey },
              preview: `🔴 MMKV DELETE  "${changedKey}"`,
              important: true,
            });
            if ((reactotron as any).stateActionComplete) {
              (reactotron as any).stateActionComplete('MMKV DELETE', { key: changedKey });
            } else if (reactotron.send) {
              reactotron.send('state.action.complete', { name: 'MMKV DELETE', action: { key: changedKey } });
            }
          }
        });
      }

      reactotron.display({
        name: 'MMKV',
        value: {
          message: `MMKV plugin connected — using ${mode} mode`,
          config: {
            mode,
            logReads,
            logContains,
            ignoredKeys: ignore,
            stateNamespace,
          },
          currentKeys: rawStorage.getAllKeys(),
        },
        preview: `✅ MMKV plugin connected (${mode})`,
        important: true,
      });
    },

    onDisconnect() {
      stateHandler.restoreMonkeyPatch(reactotronRef);
      stateHandler.stopSubscriptions();
      if (timelineListener) {
        timelineListener.remove();
        timelineListener = null;
      }
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

  const storageToReturn = mode === 'basic' ? rawStorage : proxiedStorage;

  return { plugin, storage: storageToReturn };
}
