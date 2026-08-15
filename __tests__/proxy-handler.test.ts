/**
 * Unit tests for proxy-handler.ts
 *
 * Tests that every MMKV method is intercepted and logged to Reactotron
 * with correct operation type, key, value, and old/new diffs.
 */

import { createProxiedStorage } from '../src/proxy-handler';
import { type MMKVInstance } from '../src/utils';

// ---------------------------------------------------------------------------
// Mock MMKV
// ---------------------------------------------------------------------------
function createMockMMKV(): MMKVInstance & { _store: Map<string, any> } {
  const store = new Map<string, any>();

  return {
    _store: store,
    set(key: string, value: any) {
      store.set(key, value);
    },
    getString(key: string) {
      const v = store.get(key);
      return typeof v === 'string' ? v : undefined;
    },
    getNumber(key: string) {
      const v = store.get(key);
      return typeof v === 'number' ? v : undefined;
    },
    getBoolean(key: string) {
      const v = store.get(key);
      return typeof v === 'boolean' ? v : undefined;
    },
    getBuffer(key: string) {
      const v = store.get(key);
      return v instanceof ArrayBuffer ? v : undefined;
    },
    delete(key: string) {
      store.delete(key);
    },
    contains(key: string) {
      return store.has(key);
    },
    getAllKeys() {
      return Array.from(store.keys());
    },
    clearAll() {
      store.clear();
    },
    addOnValueChangedListener(cb: (key: string) => void) {
      return { remove: () => {} };
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Reactotron
// ---------------------------------------------------------------------------
function createMockReactotron() {
  const displays: Array<{
    name: string;
    value: any;
    preview: string;
    important?: boolean;
  }> = [];

  return {
    displays,
    display(config: any) {
      displays.push(config);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('createProxiedStorage', () => {
  let mockMMKV: ReturnType<typeof createMockMMKV>;
  let mockReactotron: ReturnType<typeof createMockReactotron>;
  let storage: MMKVInstance;

  beforeEach(() => {
    mockMMKV = createMockMMKV();
    mockReactotron = createMockReactotron();
    storage = createProxiedStorage(
      mockMMKV,
      { ignore: [], logReads: true, logContains: true },
      () => mockReactotron
    );
  });

  describe('SET operations', () => {
    it('should log SET for a new key', () => {
      storage.set('token', 'abc123');

      expect(mockMMKV._store.get('token')).toBe('abc123');
      expect(mockReactotron.displays).toHaveLength(1);

      const log = mockReactotron.displays[0];
      expect(log.name).toBe('MMKV');
      expect(log.value.operation).toBe('SET');
      expect(log.value.key).toBe('token');
      expect(log.preview).toContain('SET');
      expect(log.preview).toContain('"token"');
      expect(log.important).toBe(true);
    });

    it('should log UPDATE for an existing key with old value', () => {
      mockMMKV.set('theme', 'light');

      storage.set('theme', 'dark');

      expect(mockReactotron.displays).toHaveLength(1);
      const log = mockReactotron.displays[0];
      expect(log.value.operation).toBe('UPDATE');
      expect(log.value.key).toBe('theme');
      expect(log.value.oldValue).toBe('light');
      expect(log.preview).toContain('UPDATE');
      expect(log.preview).toContain('was light');
    });

    it('should log SET for numeric values', () => {
      storage.set('count', 42);

      expect(mockReactotron.displays).toHaveLength(1);
      const log = mockReactotron.displays[0];
      expect(log.value.operation).toBe('SET');
      expect(log.value.value).toBe('42');
    });

    it('should log SET for boolean values', () => {
      storage.set('enabled', true);

      expect(mockReactotron.displays).toHaveLength(1);
      const log = mockReactotron.displays[0];
      expect(log.value.operation).toBe('SET');
      expect(log.value.value).toBe('true');
    });
  });

  describe('GET operations', () => {
    it('should log GET when logReads is enabled', () => {
      mockMMKV.set('token', 'abc123');

      const result = storage.getString('token');

      expect(result).toBe('abc123');
      expect(mockReactotron.displays).toHaveLength(1);
      const log = mockReactotron.displays[0];
      expect(log.value.operation).toBe('GET');
      expect(log.value.key).toBe('token');
      expect(log.value.method).toBe('getString');
      expect(log.important).toBe(false);
    });

    it('should NOT log GET when logReads is disabled', () => {
      mockMMKV.set('token', 'abc123');
      const quietStorage = createProxiedStorage(
        mockMMKV,
        { ignore: [], logReads: false, logContains: false },
        () => mockReactotron
      );

      const result = quietStorage.getString('token');

      expect(result).toBe('abc123');
      expect(mockReactotron.displays).toHaveLength(0);
    });

    it('should log getNumber', () => {
      mockMMKV.set('count', 42);
      storage.getNumber('count');

      expect(mockReactotron.displays).toHaveLength(1);
      expect(mockReactotron.displays[0].value.method).toBe('getNumber');
    });

    it('should log getBoolean', () => {
      mockMMKV.set('flag', true);
      storage.getBoolean('flag');

      expect(mockReactotron.displays).toHaveLength(1);
      expect(mockReactotron.displays[0].value.method).toBe('getBoolean');
    });
  });

  describe('DELETE operations', () => {
    it('should log DELETE with the deleted value', () => {
      mockMMKV.set('session', 'xyz');

      storage.delete('session');

      expect(mockMMKV._store.has('session')).toBe(false);
      expect(mockReactotron.displays).toHaveLength(1);
      const log = mockReactotron.displays[0];
      expect(log.value.operation).toBe('DELETE');
      expect(log.value.key).toBe('session');
      expect(log.value.deletedValue).toBe('xyz');
      expect(log.important).toBe(true);
    });

    it('should log DELETE for a non-existent key without a value', () => {
      storage.delete('nonexistent');

      expect(mockReactotron.displays).toHaveLength(1);
      const log = mockReactotron.displays[0];
      expect(log.value.operation).toBe('DELETE');
      expect(log.value.deletedValue).toBeUndefined();
    });
  });

  describe('CLEAR_ALL operations', () => {
    it('should log CLEAR_ALL with key count', () => {
      mockMMKV.set('a', '1');
      mockMMKV.set('b', '2');
      mockMMKV.set('c', '3');

      storage.clearAll();

      expect(mockMMKV._store.size).toBe(0);
      expect(mockReactotron.displays).toHaveLength(1);
      const log = mockReactotron.displays[0];
      expect(log.value.operation).toBe('CLEAR_ALL');
      expect(log.value.keysRemovedCount).toBe(3);
      expect(log.value.keysRemoved).toEqual(['a', 'b', 'c']);
      expect(log.preview).toContain('3 key(s)');
    });
  });

  describe('CONTAINS operations', () => {
    it('should log CONTAINS when logContains is enabled', () => {
      mockMMKV.set('token', 'abc');
      const result = storage.contains('token');

      expect(result).toBe(true);
      expect(mockReactotron.displays).toHaveLength(1);
      expect(mockReactotron.displays[0].value.operation).toBe('CONTAINS');
      expect(mockReactotron.displays[0].value.exists).toBe(true);
    });

    it('should NOT log CONTAINS when logContains is disabled', () => {
      const quietStorage = createProxiedStorage(
        mockMMKV,
        { ignore: [], logReads: false, logContains: false },
        () => mockReactotron
      );
      quietStorage.contains('token');
      expect(mockReactotron.displays).toHaveLength(0);
    });
  });

  describe('GET_ALL_KEYS operations', () => {
    it('should log getAllKeys when logReads is enabled', () => {
      mockMMKV.set('a', '1');
      mockMMKV.set('b', '2');

      const keys = storage.getAllKeys();

      expect(keys).toEqual(['a', 'b']);
      expect(mockReactotron.displays).toHaveLength(1);
      expect(mockReactotron.displays[0].value.operation).toBe('GET_ALL_KEYS');
      expect(mockReactotron.displays[0].value.count).toBe(2);
    });
  });

  describe('ignore list', () => {
    it('should not log ignored keys for SET', () => {
      const filtered = createProxiedStorage(
        mockMMKV,
        { ignore: ['noisy_key'], logReads: true, logContains: true },
        () => mockReactotron
      );

      filtered.set('noisy_key', 'value');
      expect(mockMMKV._store.get('noisy_key')).toBe('value'); // still writes
      expect(mockReactotron.displays).toHaveLength(0); // but no log
    });

    it('should not log ignored keys for GET', () => {
      mockMMKV.set('noisy_key', 'value');
      const filtered = createProxiedStorage(
        mockMMKV,
        { ignore: ['noisy_key'], logReads: true, logContains: true },
        () => mockReactotron
      );

      filtered.getString('noisy_key');
      expect(mockReactotron.displays).toHaveLength(0);
    });

    it('should not log ignored keys for DELETE', () => {
      mockMMKV.set('noisy_key', 'value');
      const filtered = createProxiedStorage(
        mockMMKV,
        { ignore: ['noisy_key'], logReads: true, logContains: true },
        () => mockReactotron
      );

      filtered.delete('noisy_key');
      expect(mockReactotron.displays).toHaveLength(0);
    });
  });

  describe('no Reactotron connected', () => {
    it('should not throw when Reactotron is null', () => {
      const noReactotron = createProxiedStorage(
        mockMMKV,
        { ignore: [], logReads: true, logContains: true },
        () => null
      );

      expect(() => {
        noReactotron.set('key', 'val');
        noReactotron.getString('key');
        noReactotron.delete('key');
        noReactotron.clearAll();
      }).not.toThrow();
    });

    it('should still perform the actual MMKV operations', () => {
      const noReactotron = createProxiedStorage(
        mockMMKV,
        { ignore: [], logReads: true, logContains: true },
        () => null
      );

      noReactotron.set('key', 'val');
      expect(mockMMKV._store.get('key')).toBe('val');

      const result = noReactotron.getString('key');
      expect(result).toBe('val');
    });
  });

  describe('method caching and referential equality', () => {
    it('should return the same method reference on repeated property access', () => {
      expect(storage.set).toBe(storage.set);
      expect(storage.getString).toBe(storage.getString);
      expect(storage.delete).toBe(storage.delete);
    });
  });
});
