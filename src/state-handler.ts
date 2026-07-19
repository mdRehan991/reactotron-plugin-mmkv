/**
 * State tab handler for the MMKV Reactotron plugin.
 *
 * Responds to Reactotron State tab commands (`state.keys.request`,
 * `state.values.request`, `state.values.subscribe`) to make MMKV data
 * browsable in the State tab alongside Redux state.
 *
 * MMKV data is namespaced (default: "mmkv") to avoid conflicts with
 * reactotron-redux.
 */

import { type MMKVInstance, readValue } from './utils';

/** Minimal Reactotron interface for state-related operations. */
interface ReactotronState {
  send(type: string, payload: unknown): void;
  stateKeysResponse?(
    path: string | null,
    keys: string[] | undefined,
    valid?: boolean
  ): void;
  stateValuesResponse?(
    path: string | null,
    value: unknown,
    valid?: boolean
  ): void;
  stateValuesChange?(changes: Array<{ path: string; value: unknown }>): void;
}

export interface StateHandlerConfig {
  namespace: string;
  storage: MMKVInstance<unknown>;
}

/**
 * Creates a state handler that responds to Reactotron State tab commands.
 *
 * Returns:
 * - `onCommand(cmd)` — call this from the plugin's `onCommand` hook
 * - `startSubscriptions()` — begin listening for MMKV changes
 * - `stopSubscriptions()` — stop listening
 */
export function createStateHandler(
  config: StateHandlerConfig,
  getReactotron: () => ReactotronState | null
) {
  const { namespace, storage } = config;

  let subscribedPaths: string[] = [];
  let listener: { remove: () => void } | null = null;

  let originalKeysResponse: any = null;
  let originalValuesResponse: any = null;
  let rootKeysResponded = false;
  let rootValuesResponded = false;

  function setupMonkeyPatch(reactotron: any) {
    if (reactotron.stateKeysResponse && !originalKeysResponse) {
      originalKeysResponse = reactotron.stateKeysResponse;
      reactotron.stateKeysResponse = (path: string | null, keys: string[] | undefined, valid?: boolean) => {
        if (!path && keys && Array.isArray(keys)) {
          rootKeysResponded = true;
          if (!keys.includes(namespace)) {
            keys = [...keys, namespace];
          }
        }
        originalKeysResponse.call(reactotron, path, keys, valid);
      };
    }

    if (reactotron.stateValuesResponse && !originalValuesResponse) {
      originalValuesResponse = reactotron.stateValuesResponse;
      reactotron.stateValuesResponse = (path: string | null, value: unknown, valid?: boolean) => {
        if (!path && value && typeof value === 'object' && !Array.isArray(value)) {
          rootValuesResponded = true;
          value = {
            ...(value as Record<string, unknown>),
            [namespace]: getFullState(),
          };
        }
        originalValuesResponse.call(reactotron, path, value, valid);
      };
    }
  }

  function restoreMonkeyPatch(reactotron: any) {
    if (originalKeysResponse && reactotron) {
      reactotron.stateKeysResponse = originalKeysResponse;
      originalKeysResponse = null;
    }
    if (originalValuesResponse && reactotron) {
      reactotron.stateValuesResponse = originalValuesResponse;
      originalValuesResponse = null;
    }
  }

  /**
   * Build the full MMKV state as a flat key→value object.
   */
  function getFullState(): Record<string, unknown> {
    const state: Record<string, unknown> = {};
    const keys = storage.getAllKeys();
    for (const key of keys) {
      state[key] = readValue(storage, key);
    }
    return state;
  }

  /**
   * Resolve a dot-separated path relative to the MMKV namespace.
   *
   * - "" or null → root (list of namespaces; we only add ours)
   * - "mmkv" → all MMKV keys
   * - "mmkv.someKey" → value of someKey
   * - "mmkv.someKey.nested" → if the value is an object, resolve further
   */
  function resolvePath(
    path: string | null | undefined,
    mode: 'keys' | 'values'
  ): { handled: boolean; result?: unknown } {
    // Root request — not our business to handle entirely,
    // but we'll inject our namespace when asked for keys.
    if (!path) {
      if (mode === 'keys') {
        // We can't simply respond here because reactotron-redux also responds.
        // We return not-handled so the main plugin can merge.
        return { handled: false };
      }
      return { handled: false };
    }

    // Not our namespace
    if (path !== namespace && !path.startsWith(namespace + '.')) {
      return { handled: false };
    }

    // Exact namespace — list all MMKV keys
    if (path === namespace) {
      if (mode === 'keys') {
        return { handled: true, result: storage.getAllKeys() };
      }
      // Values mode on the namespace itself → return the full state object
      return { handled: true, result: getFullState() };
    }

    // Path within namespace: "mmkv.someKey" or "mmkv.someKey.nested.path"
    const subPath = path.slice(namespace.length + 1); // remove "mmkv."
    const parts = subPath.split('.');
    const mmkvKey = parts[0];

    if (!storage.contains(mmkvKey)) {
      return { handled: true, result: undefined };
    }

    let value: unknown = readValue(storage, mmkvKey);

    // Resolve nested path segments (for JSON objects stored in MMKV)
    for (let i = 1; i < parts.length; i++) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = (value as Record<string, unknown>)[parts[i]];
      } else if (Array.isArray(value)) {
        const idx = parseInt(parts[i], 10);
        value = isNaN(idx) ? undefined : value[idx];
      } else {
        value = undefined;
        break;
      }
    }

    if (mode === 'keys') {
      if (value && typeof value === 'object') {
        return { handled: true, result: Object.keys(value) };
      }
      return { handled: true, result: undefined };
    }

    return { handled: true, result: value };
  }

  /**
   * Handle an incoming Reactotron command.
   * Returns true if the command was handled by this handler.
   */
  function onCommand(cmd: { type: string; payload?: { path?: string | null; paths?: string[] } }): boolean {
    const reactotron = getReactotron();
    if (!reactotron) return false;

    const { type, payload } = cmd;

    switch (type) {
      case 'state.keys.request': {
        const path = payload?.path || null;
        const resolved = resolvePath(path, 'keys');

        if (!resolved.handled) {
          // Root keys request: if no other plugin (e.g. Redux) responds
          // within 30ms, we respond ourselves with just our namespace.
          // If another plugin responds, our monkey-patch will merge it.
          if (!path && reactotron.stateKeysResponse) {
            rootKeysResponded = false;
            setTimeout(() => {
              if (!rootKeysResponded && originalKeysResponse) {
                originalKeysResponse.call(reactotron, path, [namespace]);
              }
            }, 30);
          }
          return false;
        }

        if (reactotron.stateKeysResponse) {
          reactotron.stateKeysResponse(
            path,
            resolved.result as string[] | undefined
          );
        }
        return true;
      }

      case 'state.values.request': {
        const path = payload?.path || null;
        const resolved = resolvePath(path, 'values');

        if (!resolved.handled) {
          // Root values request: if no other plugin (e.g. Redux) responds
          // within 30ms, we respond ourselves with our state.
          // If another plugin responds, our monkey-patch will merge it.
          if (!path && reactotron.stateValuesResponse) {
            rootValuesResponded = false;
            setTimeout(() => {
              if (!rootValuesResponded && originalValuesResponse) {
                originalValuesResponse.call(reactotron, path, { [namespace]: getFullState() });
              }
            }, 30);
          }
          return false;
        }

        if (reactotron.stateValuesResponse) {
          reactotron.stateValuesResponse(path, resolved.result);
        }
        return true;
      }

      case 'state.values.subscribe': {
        const paths: string[] = payload?.paths || [];
        // Filter to only MMKV-namespaced paths
        subscribedPaths = paths.filter(
          (p: string) =>
            p === namespace || p.startsWith(namespace + '.')
        );
        sendSubscriptions();
        return subscribedPaths.length > 0;
      }

      default:
        return false;
    }
  }

  /**
   * Send current values for all subscribed MMKV paths.
   */
  function sendSubscriptions() {
    const reactotron = getReactotron();
    if (
      !reactotron ||
      !reactotron.stateValuesChange ||
      subscribedPaths.length === 0
    )
      return;

    const changes: Array<{ path: string; value: unknown }> = [];

    for (const path of subscribedPaths) {
      const resolved = resolvePath(path, 'values');
      if (resolved.handled) {
        changes.push({ path, value: resolved.result });
      }
    }

    if (changes.length > 0) {
      reactotron.stateValuesChange(changes);
    }
  }

  /**
   * Start listening for MMKV value changes to push subscription updates.
   */
  function startSubscriptions() {
    if (listener) return;

    listener = storage.addOnValueChangedListener((changedKey: string) => {
      if (subscribedPaths.length === 0) return;

      // Check if any subscription matches this changed key
      const relevantPaths = subscribedPaths.filter((p) => {
        if (p === namespace) return true; // subscribed to all of mmkv
        const subPath = p.startsWith(namespace + '.')
          ? p.slice(namespace.length + 1)
          : null;
        if (!subPath) return false;
        return subPath === changedKey || subPath.startsWith(changedKey + '.');
      });

      if (relevantPaths.length > 0) {
        sendSubscriptions();
      }
    });
  }

  /**
   * Stop listening for MMKV value changes.
   */
  function stopSubscriptions() {
    listener?.remove();
    listener = null;
    subscribedPaths = [];
  }

  return {
    onCommand,
    startSubscriptions,
    stopSubscriptions,
    sendSubscriptions,
    setupMonkeyPatch,
    restoreMonkeyPatch,
    // Exposed for testing
    _resolvePath: resolvePath,
    _getFullState: getFullState,
  };
}
