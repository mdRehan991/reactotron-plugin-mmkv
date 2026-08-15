/**
 * Integration tests for mmkv-plugin.ts
 *
 * Tests the full plugin lifecycle: creation, connection, timeline logging,
 * state tab responses, and disconnection.
 */

import { mmkvPlugin } from '../src/mmkv-plugin';
import { type MMKVInstance } from '../src/utils';

// ---------------------------------------------------------------------------
// Mock MMKV
// ---------------------------------------------------------------------------
function createMockMMKV(): MMKVInstance & { _store: Map<string, any> } {
  const store = new Map<string, any>();
  const listeners: Array<(key: string) => void> = [];

  return {
    _store: store,
    set(key: string, value: any) {
      store.set(key, value);
      listeners.forEach((cb) => cb(key));
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
      listeners.forEach((cb) => cb(key));
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
      listeners.push(cb);
      return {
        remove: () => {
          const idx = listeners.indexOf(cb);
          if (idx >= 0) listeners.splice(idx, 1);
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Reactotron
// ---------------------------------------------------------------------------
function createMockReactotron() {
  const displays: any[] = [];
  const keysResponses: any[] = [];
  const valuesResponses: any[] = [];
  const valuesChanges: any[] = [];

  return {
    displays,
    keysResponses,
    valuesResponses,
    valuesChanges,
    display(config: any) {
      displays.push(config);
    },
    send(_type: string, _payload: unknown) {},
    stateKeysResponse(path: any, keys: any) {
      keysResponses.push({ path, keys });
    },
    stateValuesResponse(path: any, value: any) {
      valuesResponses.push({ path, value });
    },
    stateValuesChange(changes: any) {
      valuesChanges.push(changes);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('mmkvPlugin', () => {
  it('should return a plugin function and proxied storage', () => {
    const mockMMKV = createMockMMKV();
    const result = mmkvPlugin({ storage: mockMMKV });

    expect(result.plugin).toBeInstanceOf(Function);
    expect(result.storage).toBeDefined();
    expect(result.storage).not.toBe(mockMMKV); // should be proxied
  });

  it('should display a connection message on connect', () => {
    const mockMMKV = createMockMMKV();
    const mockReactotron = createMockReactotron();
    const { plugin } = mmkvPlugin({ storage: mockMMKV });

    const pluginInstance = plugin(mockReactotron);
    pluginInstance.onConnect();

    expect(mockReactotron.displays).toHaveLength(1);
    expect(mockReactotron.displays[0].preview).toContain('connected');
  });

  it('should log operations through the proxied storage after connect', () => {
    const mockMMKV = createMockMMKV();
    const mockReactotron = createMockReactotron();
    const { plugin, storage } = mmkvPlugin({ storage: mockMMKV });

    // Connect
    const pluginInstance = plugin(mockReactotron);
    pluginInstance.onConnect();

    // Clear the connection message
    mockReactotron.displays.length = 0;

    // Use proxied storage
    storage.set('key', 'value');

    expect(mockReactotron.displays).toHaveLength(1);
    expect(mockReactotron.displays[0].value.operation).toBe('SET');
  });

  it('should not log operations before connect', () => {
    const mockMMKV = createMockMMKV();
    const mockReactotron = createMockReactotron();
    const { plugin, storage } = mmkvPlugin({ storage: mockMMKV });

    // Use storage before connecting
    storage.set('key', 'value');

    expect(mockReactotron.displays).toHaveLength(0);

    // But the actual operation still works
    expect(mockMMKV._store.get('key')).toBe('value');
  });

  it('should stop logging after disconnect', () => {
    const mockMMKV = createMockMMKV();
    const mockReactotron = createMockReactotron();
    const { plugin, storage } = mmkvPlugin({ storage: mockMMKV });

    const pluginInstance = plugin(mockReactotron);
    pluginInstance.onConnect();
    mockReactotron.displays.length = 0;

    pluginInstance.onDisconnect();

    storage.set('key', 'value');
    expect(mockReactotron.displays).toHaveLength(0);
  });

  it('should handle state commands via onCommand', () => {
    const mockMMKV = createMockMMKV();
    mockMMKV.set('token', 'abc');
    const mockReactotron = createMockReactotron();
    const { plugin } = mmkvPlugin({ storage: mockMMKV });

    const pluginInstance = plugin(mockReactotron);
    pluginInstance.onConnect();

    pluginInstance.onCommand({
      type: 'state.keys.request',
      payload: { path: 'mmkv' },
    });

    expect(mockReactotron.keysResponses).toHaveLength(1);
    expect(mockReactotron.keysResponses[0].keys).toEqual(['token']);
  });

  it('should expose mmkvGetState feature', () => {
    const mockMMKV = createMockMMKV();
    mockMMKV.set('token', 'abc');
    mockMMKV.set('count', 5);
    const mockReactotron = createMockReactotron();
    const { plugin } = mmkvPlugin({ storage: mockMMKV });

    const pluginInstance = plugin(mockReactotron);

    expect(pluginInstance.features.mmkvGetState()).toEqual({
      token: 'abc',
      count: 5,
    });
  });

  it('should expose mmkvGetKeys feature', () => {
    const mockMMKV = createMockMMKV();
    mockMMKV.set('a', '1');
    mockMMKV.set('b', '2');
    const mockReactotron = createMockReactotron();
    const { plugin } = mmkvPlugin({ storage: mockMMKV });

    const pluginInstance = plugin(mockReactotron);

    expect(pluginInstance.features.mmkvGetKeys()).toEqual(['a', 'b']);
  });

  it('should respect ignore config', () => {
    const mockMMKV = createMockMMKV();
    const mockReactotron = createMockReactotron();
    const { plugin, storage } = mmkvPlugin({
      storage: mockMMKV,
      ignore: ['secret'],
    });

    const pluginInstance = plugin(mockReactotron);
    pluginInstance.onConnect();
    mockReactotron.displays.length = 0;

    storage.set('secret', 'hidden');
    storage.set('visible', 'shown');

    expect(mockReactotron.displays).toHaveLength(1);
    expect(mockReactotron.displays[0].value.key).toBe('visible');
  });

  it('should use custom stateNamespace', () => {
    const mockMMKV = createMockMMKV();
    mockMMKV.set('key', 'val');
    const mockReactotron = createMockReactotron();
    const { plugin } = mmkvPlugin({
      storage: mockMMKV,
      stateNamespace: 'storage',
    });

    const pluginInstance = plugin(mockReactotron);
    pluginInstance.onConnect();

    pluginInstance.onCommand({
      type: 'state.keys.request',
      payload: { path: 'storage' },
    });

    expect(mockReactotron.keysResponses[0].path).toBe('storage');
  });

  describe('mode: basic', () => {
    it('should return the raw storage instance in basic mode', () => {
      const mockMMKV = createMockMMKV();
      const { plugin, storage } = mmkvPlugin({ storage: mockMMKV, mode: 'basic' });

      expect(storage).toBe(mockMMKV); // should be raw, not proxied
    });

    it('should log operations via listener after connect in basic mode', () => {
      const mockMMKV = createMockMMKV();
      const mockReactotron = createMockReactotron();
      const { plugin, storage } = mmkvPlugin({ storage: mockMMKV, mode: 'basic' });

      const pluginInstance = plugin(mockReactotron);
      pluginInstance.onConnect();

      // Clear connection messages
      mockReactotron.displays.length = 0;

      // Trigger SET
      storage.set('my_key', 'my_val');
      expect(mockReactotron.displays).toHaveLength(1);
      expect(mockReactotron.displays[0].value).toEqual({
        operation: 'SET',
        key: 'my_key',
        value: 'my_val',
      });
      expect(mockReactotron.displays[0].preview).toContain('SET');

      // Trigger DELETE
      storage.delete('my_key');
      expect(mockReactotron.displays).toHaveLength(2);
      expect(mockReactotron.displays[1].value).toEqual({
        operation: 'DELETE',
        key: 'my_key',
      });
      expect(mockReactotron.displays[1].preview).toContain('DELETE');
    });

    it('should not log operations in basic mode before connect or after disconnect', () => {
      const mockMMKV = createMockMMKV();
      const mockReactotron = createMockReactotron();
      const { plugin, storage } = mmkvPlugin({ storage: mockMMKV, mode: 'basic' });

      // Try set before connect
      storage.set('a', '1');
      expect(mockReactotron.displays).toHaveLength(0);

      const pluginInstance = plugin(mockReactotron);
      pluginInstance.onConnect();
      mockReactotron.displays.length = 0;

      // Try set after connect
      storage.set('b', '2');
      // We expect 1 message (the SET log) because we cleared the connection info display
      expect(mockReactotron.displays).toHaveLength(1);
      mockReactotron.displays.length = 0;

      pluginInstance.onDisconnect();

      // Try set after disconnect
      storage.set('c', '3');
      expect(mockReactotron.displays).toHaveLength(0);
    });
  });
});
