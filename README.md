# reactotron-plugin-mmkv

A full-featured [Reactotron](https://github.com/infinitered/reactotron) plugin for [`react-native-mmkv`](https://github.com/mrousavy/react-native-mmkv) that provides:

- 🔍 **Timeline Logging** — Log every MMKV operation (SET, UPDATE, GET, DELETE, CLEAR_ALL) with old/new value diffs
- 📊 **State Tab Integration** — Browse all MMKV key-values in Reactotron's State tab, just like Redux state
- 🔄 **Live Subscriptions** — Watch MMKV values update in real-time in the State tab
- 🎯 **Operation Differentiation** — Distinguishes between SET (new key) and UPDATE (existing key)
- 🔇 **Configurable Noise Control** — Ignore specific keys, toggle read/contains logging

## Why?

The existing `reactotron-react-native-mmkv` package only uses MMKV's `addOnValueChangedListener`, which:
- ❌ Only fires on value changes (not on get/delete/clearAll)
- ❌ Only provides the key — no operation type, no old/new values
- ❌ Shows everything as `Set "key"` — useless for debugging
- ❌ No State tab support

This plugin fixes all of these by using a **Proxy-based interception** approach.

## Installation

Install as a **dev dependency** since Reactotron is only used during development:

```bash
npm install --save-dev reactotron-plugin-mmkv
# or
yarn add -D reactotron-plugin-mmkv
```

### Peer Dependencies

Make sure you have these installed:
- `react-native` >= 0.74.0 (requires New Architecture)
- `react-native-mmkv` >= 3.0.0
- `reactotron-core-client` >= 2.0.0 (comes with `reactotron-react-native`)

## Integration Modes

This plugin offers two modes depending on your codebase size and debugging requirements:

| Feature | `basic` Mode (Recommended) | `proxy` Mode (Default) |
|---|---|---|
| **Timeline Logs** | Basic write/delete logging | Full logging (with reads and old value diffs) |
| **State Tab** | Yes (Full browsing & subscriptions) | Yes (Full browsing & subscriptions) |
| **Integration** | **Zero-Touch** (Uses raw storage directly) | Requires wrapped instance export or monkey-patching |
| **Timeline Noise** | Low | High (captures every get/contains/delete/clear) |

---

## DevDependency & Production Setup

`reactotron-plugin-mmkv` should **always** be installed as a `devDependency` in `package.json` for **both** `basic` and `proxy` modes.

| Mode | `package.json` | Release / Production Behavior |
|---|---|---|
| **`basic` Mode** | `devDependencies` | **Zero-Touch.** Your app imports raw MMKV directly. The plugin is only referenced inside `if (__DEV__)` in Reactotron config, so Metro bundler strips it entirely in release builds. |
| **`proxy` Mode** | `devDependencies` | **Production Fallback.** In release builds (`!__DEV__`), fall back to exporting the raw MMKV instance so your app runs at full native speed without proxy overhead or dev dependency issues. |

### Production-Safe Pattern for `proxy` Mode

When using `proxy` mode, wrap the plugin initialization inside `if (__DEV__)` so release builds export raw MMKV directly:

```typescript
import { MMKV } from 'react-native-mmkv';

const rawStorage = new MMKV({ id: 'mmkv.default' });
let LocalStorage = rawStorage;

if (__DEV__) {
  const { mmkvPlugin } = require('reactotron-plugin-mmkv');
  const Reactotron = require('reactotron-react-native').default;

  const { plugin, storage } = mmkvPlugin({
    storage: rawStorage,
    mode: 'proxy',
  });

  Reactotron.use(plugin);
  LocalStorage = storage;
}

export { LocalStorage };
```

---

## Usage

### Option A: `basic` Mode (Zero-Touch, Recommended)

This mode uses `react-native-mmkv`'s native change listener. It does **not** modify your storage instance, meaning you don't need to change any imports in your app code.

#### 1. Configure Reactotron

```typescript
import Reactotron from 'reactotron-react-native';
import { mmkvPlugin } from 'reactotron-plugin-mmkv';
import { LocalStorage } from './path/to/storage'; // Your existing raw MMKV instance

if (__DEV__) {
  const { plugin } = mmkvPlugin({
    storage: LocalStorage,
    mode: 'basic', // Opt-in to zero-touch basic mode
  });

  Reactotron
    .configure()
    .useReactNative()
    .use(plugin)
    .connect();
}
```

#### 2. App Usage

Use your existing `LocalStorage` instance exactly as you did before. There's no need to change imports anywhere in your app:

```typescript
import { LocalStorage } from './path/to/storage';

// Automatically logged in Reactotron timeline & updated in State Tab!
LocalStorage.set('theme', 'dark');
```

---

### Option B: `proxy` Mode (Advanced Interception)

This mode wraps your MMKV instance in a JavaScript `Proxy` to intercept every read, write, delete, and clear action.

#### 1. Configure Reactotron (Production-Safe)

```typescript
import Reactotron from 'reactotron-react-native';
import { MMKV } from 'react-native-mmkv';

const rawStorage = new MMKV({ id: 'mmkv.default' });
let LocalStorage = rawStorage;

if (__DEV__) {
  const { mmkvPlugin } = require('reactotron-plugin-mmkv');

  const { plugin, storage } = mmkvPlugin({
    storage: rawStorage,
    mode: 'proxy', // Default
  });

  Reactotron
    .configure()
    .useReactNative()
    .use(plugin)
    .connect();

  LocalStorage = storage;
}

export { LocalStorage };
```

#### 2. App Usage

You must import and use the exported `LocalStorage` from your storage/Reactotron file:

```typescript
import { LocalStorage } from './path/to/storage';

// Intercepts reads, writes, and shows old vs new diffs in timeline!
LocalStorage.set('theme', 'dark'); 
```

### With Redux

```typescript
import Reactotron from 'reactotron-react-native';
import { reactotronRedux } from 'reactotron-redux';
import { mmkvPlugin } from 'reactotron-plugin-mmkv';
import { MMKV } from 'react-native-mmkv';

const rawStorage = new MMKV();
const { plugin, storage } = mmkvPlugin({
  storage: rawStorage,
  ignore: ['noisy_key'],
});

Reactotron
  .configure()
  .useReactNative()
  .use(reactotronRedux())
  .use(plugin)
  .connect();

export { storage as LocalStorage };
```

## What You'll See in Reactotron

### Timeline Tab

Every MMKV operation appears as a log entry with clear visual indicators:

```
🟢 MMKV SET      "user_token"    →  "eyJhbGci..."
🔵 MMKV GET      "user_token"    →  "eyJhbGci..."
🟡 MMKV UPDATE   "theme"         →  "dark" (was "light")
🔴 MMKV DELETE   "session_id"    (was "abc123")
⚫ MMKV CLEAR_ALL                 removed 5 key(s)
```

### State Tab

Browse MMKV data alongside Redux state:

```
├── auth          (Redux)
├── user          (Redux)
├── settings      (Redux)
└── mmkv          ← MMKV data
    ├── user_token: "eyJhbGci..."
    ├── theme: "dark"
    ├── user_settings: { volume: 80, muted: false }
    └── onboarding_complete: true
```

JSON-stored objects are automatically parsed and browsable — you can drill into nested structures.

## Configuration

```typescript
const { plugin, storage } = mmkvPlugin({
  // Required: your MMKV instance
  storage: rawStorage,

  // Optional: 'basic' | 'proxy' (default: 'proxy')
  // Use 'basic' for zero-touch configuration using change listeners.
  // Use 'proxy' for full interception of reads, deletes, and diffs.
  mode: 'proxy',

  // Optional: keys to never log (default: [])
  ignore: ['noisy_analytics_key', 'frequent_cache_key'],

  // Optional: log GET operations in timeline (default: false, proxy mode only)
  // ⚠️ Can be very noisy — enable only when debugging specific reads
  logReads: false,

  // Optional: log CONTAINS operations in timeline (default: false, proxy mode only)
  logContains: false,

  // Optional: namespace in State tab (default: 'mmkv')
  // Change this if you have multiple MMKV instances
  stateNamespace: 'mmkv',

  // Optional: max string length before turning long strings into expandable sublists in State tab (default: 100)
  // Set to 0 or false to disable
  maxStringLength: 100,

  // Optional: whether to recursively parse nested stringified JSON in objects and arrays for State tab (default: true)
  deepParseJson: true,
});
```

## API

### `mmkvPlugin(config)`

Creates the plugin and storage wrapper.

**Parameters:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage` | `MMKV` | *required* | Your MMKV instance |
| `mode` | `'basic' \| 'proxy'` | `'proxy'` | Integration mode |
| `ignore` | `string[]` | `[]` | Keys to exclude from logging |
| `logReads` | `boolean` | `false` | Log GET operations (proxy mode only) |
| `logContains` | `boolean` | `false` | Log CONTAINS operations (proxy mode only) |
| `stateNamespace` | `string` | `'mmkv'` | State tab namespace |
| `maxStringLength` | `number \| false` | `100` | Max string length before formatting as sublist in State tab |
| `deepParseJson` | `boolean` | `true` | Recursively parse nested JSON strings for State tab |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `plugin` | `Function` | Pass to `Reactotron.use(plugin)` |
| `storage` | `MMKV` | Proxied MMKV instance (or original instance if using `'basic'` mode) |

### Reactotron Features

After connecting, these methods are available on the Reactotron instance:

- `Reactotron.mmkvGetState()` — Returns all MMKV data as an object
- `Reactotron.mmkvGetKeys()` — Returns all MMKV keys

## Multiple MMKV Instances

If you use multiple MMKV instances, create a plugin for each with a different namespace:

```typescript
const userStorage = new MMKV({ id: 'user' });
const cacheStorage = new MMKV({ id: 'cache' });

const userPlugin = mmkvPlugin({
  storage: userStorage,
  mode: 'basic',
  stateNamespace: 'mmkv.user',
});

const cachePlugin = mmkvPlugin({
  storage: cacheStorage,
  mode: 'basic',
  stateNamespace: 'mmkv.cache',
});

Reactotron
  .use(userPlugin.plugin)
  .use(cachePlugin.plugin)
  .connect();
```

## How It Works

1. **Interception Modes**: 
   * **`basic` mode**: Connects to the native `addOnValueChangedListener` callback. This captures write and delete operations directly from the MMKV engine with no wrapper.
   * **`proxy` mode**: Wraps your MMKV instance in a JS `Proxy`. Every method call (`set`, `getString`, `delete`, etc.) is intercepted, logged, and forwarded to the real MMKV instance.

2. **State Tab Protocol**: The plugin responds to Reactotron's state commands (`state.keys.request`, `state.values.request`, `state.values.subscribe`) to make MMKV data browsable in the State tab.

3. **Zero Production Overhead**: The plugin code is designed to only compile/log when `__DEV__` is active. In production (where Reactotron isn't configured), there is no performance impact.

## Contributing

```bash
# Clone the repo
git clone https://github.com/mdRehan991/reactotron-plugin-mmkv.git

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT
