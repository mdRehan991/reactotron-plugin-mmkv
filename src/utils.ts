/**
 * Shared utilities for the MMKV Reactotron plugin.
 */

/**
 * Truncate a value to a max string length for Reactotron previews.
 */
export function truncate(value: unknown, maxLen = 80): string {
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'string') {
    return value.length > maxLen ? value.slice(0, maxLen) + '…' : value;
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    return String(value);
  }
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return `<ArrayBuffer ${value.byteLength} bytes>`;
  }
  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) {
    return `<${value.constructor.name} ${value.byteLength} bytes>`;
  }
  try {
    const str = JSON.stringify(value) ?? String(value);
    return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
  } catch {
    return String(value);
  }
}

/**
 * Options for formatting state values for Reactotron's State tab.
 */
export interface FormatValueOptions {
  /**
   * Maximum length for string values in the State tab before converting them
   * into an expandable sublist object ({ format: 'custom', type: 'string', length, value }).
   * Set to `0` or `false` to disable.
   * @default 100
   */
  maxStringLength?: number | false;
  /**
   * Whether to recursively parse nested JSON strings (objects/arrays) into real objects/arrays.
   * @default true
   */
  deepParseJson?: boolean;
}

/**
 * Safely parse a JSON string (objects or arrays), returning the parsed value or the raw string.
 * Retains primitive strings (e.g. "123", "true", "null") as strings.
 */
export function parseJsonSafe(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

/**
 * Format a value for Reactotron state tree inspection.
 * - Recursively parses nested JSON strings (objects/arrays) into real objects/arrays.
 * - Transforms long strings exceeding maxStringLength into an expandable sublist object ({ format: 'custom', type: 'string', length, value }).
 */
export function formatValueForState(
  value: unknown,
  options: FormatValueOptions = {},
  seen = new WeakSet<object>()
): unknown {
  const { maxStringLength = 100, deepParseJson = true } = options;

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    if (deepParseJson) {
      const trimmed = value.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === 'object' && parsed !== null) {
            return formatValueForState(parsed, options, seen);
          }
        } catch {
          // If JSON parsing fails, fall through to length check
        }
      }
    }

    if (
      typeof maxStringLength === 'number' &&
      maxStringLength > 0 &&
      value.length > maxStringLength
    ) {
      return {
        format: 'custom',
        type: typeof value,
        length: value.length,
        value: value,
      };
    }

    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return truncate(value);
  }

  if (typeof ArrayBuffer !== 'undefined' && ArrayBuffer.isView(value)) {
    return truncate(value);
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    return value.map((item) => formatValueForState(item, options, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = formatValueForState(v, options, seen);
    }
    return result;
  }

  return String(value);
}

/**
 * MMKV operation types for timeline logging.
 */
export const OPERATION = Object.freeze({
  SET: 'SET' as const,
  UPDATE: 'UPDATE' as const,
  GET: 'GET' as const,
  DELETE: 'DELETE' as const,
  CLEAR_ALL: 'CLEAR_ALL' as const,
  CONTAINS: 'CONTAINS' as const,
  GET_ALL_KEYS: 'GET_ALL_KEYS' as const,
});

export type OperationType = (typeof OPERATION)[keyof typeof OPERATION];

/**
 * Emoji icons for each operation type, used in timeline preview strings.
 */
export const EMOJI: Record<OperationType, string> = {
  [OPERATION.SET]: '🟢',
  [OPERATION.UPDATE]: '🟡',
  [OPERATION.GET]: '🔵',
  [OPERATION.DELETE]: '🔴',
  [OPERATION.CLEAR_ALL]: '⚫',
  [OPERATION.CONTAINS]: '🟣',
  [OPERATION.GET_ALL_KEYS]: '📋',
};

/**
 * Method names that write a value (set / update).
 */
export const SET_METHODS = new Set(['set']);

/**
 * Method names that read a value.
 */
export const GET_METHODS = new Set([
  'getString',
  'getNumber',
  'getBoolean',
  'getBuffer',
]);

/**
 * Minimal interface for what we need from the MMKV instance.
 * Avoids importing the full react-native-mmkv type at runtime.
 */
export interface ReactotronDisplay {
  display(config: {
    name: string;
    value: unknown;
    preview: string;
    important?: boolean;
  }): void;
}

export interface ReactotronState {
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

export interface ReactotronPluginInstance extends ReactotronDisplay, ReactotronState {}

/**
 * Minimal interface for what we need from the MMKV instance.
 * Avoids importing the full react-native-mmkv type at runtime.
 */
export interface MMKVInstance<T = ArrayBuffer | Uint8Array> {
  set(key: string, value: string | number | boolean | T): void;
  getString(key: string): string | undefined;
  getNumber(key: string): number | undefined;
  getBoolean(key: string): boolean | undefined;
  getBuffer(key: string): T | undefined;
  delete(key: string): void;
  contains(key: string): boolean;
  getAllKeys(): string[];
  clearAll(): void;
  addOnValueChangedListener(
    onValueChanged: (key: string) => void
  ): { remove: () => void };
}

/**
 * Read any value from MMKV by trying each typed getter.
 * Checks contains() first to avoid unnecessary getter calls.
 * Tries getString first (with JSON parse for objects/arrays),
 * then falls back to getNumber, getBoolean, and getBuffer.
 */
export function readValue(storage: MMKVInstance<unknown>, key: string): unknown {
  if (!storage.contains(key)) return undefined;

  const str = storage.getString(key);
  if (str !== undefined) {
    return parseJsonSafe(str);
  }

  const num = storage.getNumber(key);
  if (num !== undefined) return num;

  const bool = storage.getBoolean(key);
  if (bool !== undefined) return bool;

  const buf = storage.getBuffer(key);
  if (buf !== undefined) return truncate(buf);

  return undefined;
}

/**
 * Read the raw string value from MMKV (without JSON parsing).
 * Checks contains() first to avoid unnecessary getter calls.
 * Falls back to getNumber → getBoolean if getString returns undefined.
 */
export function readRawValue(
  storage: MMKVInstance<unknown>,
  key: string
): string | number | boolean | undefined {
  if (!storage.contains(key)) return undefined;

  const str = storage.getString(key);
  if (str !== undefined) return str;

  const num = storage.getNumber(key);
  if (num !== undefined) return num;

  const bool = storage.getBoolean(key);
  if (bool !== undefined) return bool;

  return undefined;
}

/**
 * Plugin configuration options.
 */
export interface MmkvPluginConfig<T = ArrayBuffer | Uint8Array> {
  /** The raw MMKV storage instance to wrap. */
  storage: MMKVInstance<T>;
  /**
   * Integration mode:
   * - 'basic' (default): zero-touch using addOnValueChangedListener for timeline writes and state tab. No proxy/monkey-patch required.
   * - 'proxy': intercepts all operations (including reads and value diffs) using a JS Proxy wrapper.
   */
  mode?: 'basic' | 'proxy';
  /** Keys to never log in the timeline. */
  ignore?: string[];
  /** Whether to log GET operations in the timeline (default: false). */
  logReads?: boolean;
  /** Whether to log CONTAINS operations in the timeline (default: false). */
  logContains?: boolean;
  /** Namespace used in the State tab (default: 'mmkv'). */
  stateNamespace?: string;
  /**
   * Maximum length for string values in the State tab before converting them into an expandable sublist object ({ format: 'custom', type: 'string', length, value }).
   * Set to `0` or `false` to disable.
   * @default 100
   */
  maxStringLength?: number | false;
  /**
   * Whether to recursively parse nested JSON strings in objects and arrays for the State tab.
   * @default true
   */
  deepParseJson?: boolean;
}
