/**
 * Unit tests for state-handler.ts
 *
 * Tests that the state handler correctly responds to Reactotron State tab
 * commands (keys request, values request, subscriptions) with MMKV data.
 */

import { createStateHandler } from '../src/state-handler';
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
  const keysResponses: Array<{ path: string | null; keys: any }> = [];
  const valuesResponses: Array<{ path: string | null; value: any }> = [];
  const valuesChanges: Array<Array<{ path: string; value: any }>> = [];

  return {
    keysResponses,
    valuesResponses,
    valuesChanges,
    send(_type: string, _payload: unknown) {},
    stateKeysResponse(path: string | null, keys: any) {
      keysResponses.push({ path, keys });
    },
    stateValuesResponse(path: string | null, value: any) {
      valuesResponses.push({ path, value });
    },
    stateValuesChange(changes: Array<{ path: string; value: any }>) {
      valuesChanges.push(changes);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('createStateHandler', () => {
  let mockMMKV: ReturnType<typeof createMockMMKV>;
  let mockReactotron: ReturnType<typeof createMockReactotron>;
  let handler: ReturnType<typeof createStateHandler>;

  beforeEach(() => {
    mockMMKV = createMockMMKV();
    mockReactotron = createMockReactotron();
    handler = createStateHandler(
      { namespace: 'mmkv', storage: mockMMKV },
      () => mockReactotron
    );
  });

  describe('state.keys.request', () => {
    it('should return all MMKV keys for the namespace path', () => {
      mockMMKV.set('user_token', 'abc');
      mockMMKV.set('theme', 'dark');

      const handled = handler.onCommand({
        type: 'state.keys.request',
        payload: { path: 'mmkv' },
      });

      expect(handled).toBe(true);
      expect(mockReactotron.keysResponses).toHaveLength(1);
      expect(mockReactotron.keysResponses[0].path).toBe('mmkv');
      expect(mockReactotron.keysResponses[0].keys).toEqual([
        'user_token',
        'theme',
      ]);
    });

    it('should return object keys for a JSON-stored value', () => {
      mockMMKV.set('settings', JSON.stringify({ volume: 80, muted: false }));

      const handled = handler.onCommand({
        type: 'state.keys.request',
        payload: { path: 'mmkv.settings' },
      });

      expect(handled).toBe(true);
      expect(mockReactotron.keysResponses[0].keys).toEqual([
        'volume',
        'muted',
      ]);
    });

    it('should return undefined for a primitive value path', () => {
      mockMMKV.set('simple', 'hello');

      handler.onCommand({
        type: 'state.keys.request',
        payload: { path: 'mmkv.simple' },
      });

      expect(mockReactotron.keysResponses[0].keys).toBeUndefined();
    });

    it('should not handle paths outside the namespace', () => {
      const handled = handler.onCommand({
        type: 'state.keys.request',
        payload: { path: 'redux.auth' },
      });

      expect(handled).toBe(false);
    });
  });

  describe('state.values.request', () => {
    it('should return all MMKV data for the namespace path', () => {
      mockMMKV.set('token', 'abc');
      mockMMKV.set('count', 42);

      handler.onCommand({
        type: 'state.values.request',
        payload: { path: 'mmkv' },
      });

      expect(mockReactotron.valuesResponses).toHaveLength(1);
      expect(mockReactotron.valuesResponses[0].value).toEqual({
        token: 'abc',
        count: 42,
      });
    });

    it('should return a specific value for a key path', () => {
      mockMMKV.set('token', 'abc123');

      handler.onCommand({
        type: 'state.values.request',
        payload: { path: 'mmkv.token' },
      });

      expect(mockReactotron.valuesResponses[0].value).toBe('abc123');
    });

    it('should resolve nested paths in JSON values', () => {
      mockMMKV.set(
        'user',
        JSON.stringify({ profile: { name: 'John', age: 30 } })
      );

      handler.onCommand({
        type: 'state.values.request',
        payload: { path: 'mmkv.user.profile.name' },
      });

      expect(mockReactotron.valuesResponses[0].value).toBe('John');
    });

    it('should return undefined for a non-existent key', () => {
      handler.onCommand({
        type: 'state.values.request',
        payload: { path: 'mmkv.nonexistent' },
      });

      expect(mockReactotron.valuesResponses[0].value).toBeUndefined();
    });

    it('should parse JSON-stored arrays', () => {
      mockMMKV.set('list', JSON.stringify([1, 2, 3]));

      handler.onCommand({
        type: 'state.values.request',
        payload: { path: 'mmkv.list' },
      });

      expect(mockReactotron.valuesResponses[0].value).toEqual([1, 2, 3]);
    });

    it('should resolve array indices in nested paths', () => {
      mockMMKV.set('items', JSON.stringify(['a', 'b', 'c']));

      handler.onCommand({
        type: 'state.values.request',
        payload: { path: 'mmkv.items.1' },
      });

      expect(mockReactotron.valuesResponses[0].value).toBe('b');
    });
  });

  describe('state.values.subscribe', () => {
    it('should subscribe to MMKV-namespaced paths only', () => {
      mockMMKV.set('theme', 'light');

      const handled = handler.onCommand({
        type: 'state.values.subscribe',
        payload: { paths: ['mmkv.theme', 'redux.auth'] },
      });

      expect(handled).toBe(true);
      // Should have sent initial subscription values
      expect(mockReactotron.valuesChanges).toHaveLength(1);
      expect(mockReactotron.valuesChanges[0]).toEqual([
        { path: 'mmkv.theme', value: 'light' },
      ]);
    });

    it('should push updates when subscribed values change', () => {
      mockMMKV.set('theme', 'light');
      handler.startSubscriptions();

      handler.onCommand({
        type: 'state.values.subscribe',
        payload: { paths: ['mmkv.theme'] },
      });

      // Clear initial subscription send
      mockReactotron.valuesChanges.length = 0;

      // Trigger a change
      mockMMKV.set('theme', 'dark');

      expect(mockReactotron.valuesChanges).toHaveLength(1);
      expect(mockReactotron.valuesChanges[0]).toEqual([
        { path: 'mmkv.theme', value: 'dark' },
      ]);
    });

    it('should not push updates for unsubscribed keys', () => {
      handler.startSubscriptions();

      handler.onCommand({
        type: 'state.values.subscribe',
        payload: { paths: ['mmkv.theme'] },
      });

      mockReactotron.valuesChanges.length = 0;

      // Change a different key
      mockMMKV.set('unrelated', 'value');

      expect(mockReactotron.valuesChanges).toHaveLength(0);
    });

    it('should subscribe to all keys when subscribing to the namespace', () => {
      mockMMKV.set('a', '1');
      handler.startSubscriptions();

      handler.onCommand({
        type: 'state.values.subscribe',
        payload: { paths: ['mmkv'] },
      });

      mockReactotron.valuesChanges.length = 0;

      mockMMKV.set('b', '2');

      expect(mockReactotron.valuesChanges).toHaveLength(1);
    });
  });

  describe('stopSubscriptions', () => {
    it('should stop sending updates after stopSubscriptions()', () => {
      handler.startSubscriptions();

      handler.onCommand({
        type: 'state.values.subscribe',
        payload: { paths: ['mmkv.theme'] },
      });

      mockReactotron.valuesChanges.length = 0;

      handler.stopSubscriptions();
      mockMMKV.set('theme', 'dark');

      expect(mockReactotron.valuesChanges).toHaveLength(0);
    });
  });

  describe('_getFullState', () => {
    it('should return all keys with parsed values', () => {
      mockMMKV.set('str', 'hello');
      mockMMKV.set('num', 42);
      mockMMKV.set('bool', true);
      mockMMKV.set('json', JSON.stringify({ nested: true }));

      const state = handler._getFullState();

      expect(state).toEqual({
        str: 'hello',
        num: 42,
        bool: true,
        json: { nested: true },
      });
    });
  });

  describe('custom namespace', () => {
    it('should use a custom namespace', () => {
      const customHandler = createStateHandler(
        { namespace: 'storage', storage: mockMMKV },
        () => mockReactotron
      );

      mockMMKV.set('key', 'value');

      customHandler.onCommand({
        type: 'state.keys.request',
        payload: { path: 'storage' },
      });

      expect(mockReactotron.keysResponses[0].path).toBe('storage');
      expect(mockReactotron.keysResponses[0].keys).toEqual(['key']);
    });
  });
});
