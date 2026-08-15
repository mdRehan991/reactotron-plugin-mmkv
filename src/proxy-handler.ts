/**
 * Proxy-based interception handler for MMKV method calls.
 *
 * Wraps an MMKV instance with a JS Proxy that intercepts set, get, delete,
 * clearAll, contains, and getAllKeys — logging each operation to Reactotron's
 * timeline with full context (operation type, key, value, old vs new).
 */

import {
  type MMKVInstance,
  type OperationType,
  type ReactotronDisplay,
  type ReactotronState,
  OPERATION,
  EMOJI,
  SET_METHODS,
  GET_METHODS,
  truncate,
  readRawValue,
} from './utils';

export interface ProxyHandlerConfig {
  ignore: string[];
  logReads: boolean;
  logContains: boolean;
}

/**
 * Creates a proxied MMKV instance and a log function bound to a mutable
 * Reactotron reference.
 */
export function createProxiedStorage<T = ArrayBuffer | Uint8Array>(
  rawStorage: MMKVInstance<T>,
  config: ProxyHandlerConfig,
  getReactotron: () => (ReactotronDisplay & Partial<ReactotronState>) | null
): MMKVInstance<T> {
  const { ignore, logReads, logContains } = config;

  // ---------------------------------------------------------------
  // Internal logger
  // ---------------------------------------------------------------
  function log(
    operation: OperationType,
    key: string | undefined,
    extra: { value?: Record<string, unknown>; preview?: string } = {}
  ) {
    const reactotron = getReactotron();
    if (!reactotron) return;

    const emoji = EMOJI[operation] || '';
    const previewParts = [`${emoji} MMKV ${operation}`];
    if (key !== undefined) previewParts.push(`"${key}"`);
    if (extra.preview) previewParts.push(extra.preview);

    reactotron.display({
      name: 'MMKV',
      value: { operation, key, ...extra.value },
      preview: previewParts.join('  '),
      important:
        operation !== OPERATION.GET &&
        operation !== OPERATION.CONTAINS &&
        operation !== OPERATION.GET_ALL_KEYS,
    });

    if (
      operation === OPERATION.SET ||
      operation === OPERATION.UPDATE ||
      operation === OPERATION.DELETE ||
      operation === OPERATION.CLEAR_ALL
    ) {
      if ((reactotron as any).stateActionComplete) {
        (reactotron as any).stateActionComplete(
          `MMKV ${operation}`,
          { key, ...extra.value }
        );
      } else if (reactotron.send) {
        reactotron.send('state.action.complete', {
          name: `MMKV ${operation}`,
          action: { key, ...extra.value },
        });
      }
    }
  }

  // ---------------------------------------------------------------
  // Proxy handler
  // ---------------------------------------------------------------
  const handler: ProxyHandler<MMKVInstance<T>> = {
    get(target, prop: string | symbol, receiver) {
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop, receiver);
      }

      const original = (target as unknown as Record<string, Function>)[prop];

      // Only intercept function calls
      if (typeof original !== 'function') {
        return Reflect.get(target, prop, receiver);
      }

      // --- SET / UPDATE -------------------------------------------
      if (SET_METHODS.has(prop)) {
        return function proxiedSet(
          key: string,
          value: string | number | boolean | T
        ) {
          if (!ignore.includes(key)) {
            const existed = target.contains(key);
            let oldValue: string | number | boolean | undefined;
            if (existed) {
              oldValue = readRawValue(target, key);
            }

            const result = original.call(target, key, value);

            const operation = existed ? OPERATION.UPDATE : OPERATION.SET;
            const valueDisplay = truncate(value);
            const extraValue: Record<string, unknown> = { value: valueDisplay };
            let preview = `→  ${valueDisplay}`;

            if (existed && oldValue !== undefined) {
              extraValue.oldValue = truncate(oldValue);
              preview += ` (was ${truncate(oldValue, 40)})`;
            }

            log(operation, key, { value: extraValue, preview });
            return result;
          }
          return original.call(target, key, value);
        };
      }

      // --- GET ----------------------------------------------------
      if (GET_METHODS.has(prop)) {
        return function proxiedGet(key: string) {
          const result = original.call(target, key);
          if (logReads && !ignore.includes(key)) {
            log(OPERATION.GET, key, {
              value: {
                method: prop,
                returnedValue: truncate(result),
              },
              preview: `→  ${truncate(result)}`,
            });
          }
          return result;
        };
      }

      // --- DELETE -------------------------------------------------
      if (prop === 'delete') {
        return function proxiedDelete(key: string) {
          if (!ignore.includes(key)) {
            const oldValue = readRawValue(target, key);
            const result = original.call(target, key);

            const extraValue: Record<string, unknown> = {};
            let preview = '';
            if (oldValue !== undefined) {
              extraValue.deletedValue = truncate(oldValue);
              preview = `(was ${truncate(oldValue, 40)})`;
            }

            log(OPERATION.DELETE, key, { value: extraValue, preview });
            return result;
          }
          return original.call(target, key);
        };
      }

      // --- CLEAR_ALL ----------------------------------------------
      if (prop === 'clearAll') {
        return function proxiedClearAll() {
          const keyCount = target.getAllKeys().length;
          const result = original.call(target);
          log(OPERATION.CLEAR_ALL, undefined, {
            value: { keysRemoved: keyCount },
            preview: `removed ${keyCount} key(s)`,
          });
          return result;
        };
      }

      // --- CONTAINS -----------------------------------------------
      if (prop === 'contains') {
        return function proxiedContains(key: string) {
          const result = original.call(target, key);
          if (logContains && !ignore.includes(key)) {
            log(OPERATION.CONTAINS, key, {
              value: { exists: result },
              preview: `→  ${result}`,
            });
          }
          return result;
        };
      }

      // --- GET_ALL_KEYS -------------------------------------------
      if (prop === 'getAllKeys') {
        return function proxiedGetAllKeys() {
          const result = original.call(target);
          if (logReads) {
            log(OPERATION.GET_ALL_KEYS, undefined, {
              value: { keys: result, count: result.length },
              preview: `${result.length} key(s)`,
            });
          }
          return result;
        };
      }

      // --- Pass-through -------------------------------------------
      return original.bind(target);
    },
  };

  return new Proxy(rawStorage, handler);
}
