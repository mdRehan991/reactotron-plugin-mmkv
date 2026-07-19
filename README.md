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

```bash
npm install reactotron-plugin-mmkv
# or
yarn add reactotron-plugin-mmkv
```

### Peer Dependencies

Make sure you have these installed:
- `react-native` >= 0.74.0 (requires New Architecture)
- `react-native-mmkv` >= 3.0.0
- `reactotron-core-client` >= 2.0.0 (comes with `reactotron-react-native`)

## Usage

### Basic Setup

```typescript
import Reactotron from 'reactotron-react-native';
import { mmkvPlugin } from 'reactotron-plugin-mmkv';
import { MMKV } from 'react-native-mmkv';

// 1. Create your raw MMKV instance
const rawStorage = new MMKV({ id: 'mmkv.default' });

// 2. Create the plugin — returns the Reactotron plugin + proxied storage
const { plugin, storage } = mmkvPlugin({ storage: rawStorage });

// 3. Wire up Reactotron
Reactotron
  .configure()
  .useReactNative()
  .use(plugin)
  .connect();

// 4. Use `storage` everywhere in your app (NOT rawStorage)
export { storage as LocalStorage };
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

  // Optional: keys to never log (default: [])
  ignore: ['noisy_analytics_key', 'frequent_cache_key'],

  // Optional: log GET operations in timeline (default: false)
  // ⚠️ Can be very noisy — enable only when debugging specific reads
  logReads: false,

  // Optional: log CONTAINS operations in timeline (default: false)
  logContains: false,

  // Optional: namespace in State tab (default: 'mmkv')
  // Change this if you have multiple MMKV instances
  stateNamespace: 'mmkv',
});
```

## API

### `mmkvPlugin(config)`

Creates the plugin and proxied storage.

**Parameters:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `storage` | `MMKV` | *required* | Your MMKV instance |
| `ignore` | `string[]` | `[]` | Keys to exclude from logging |
| `logReads` | `boolean` | `false` | Log GET operations |
| `logContains` | `boolean` | `false` | Log CONTAINS operations |
| `stateNamespace` | `string` | `'mmkv'` | State tab namespace |

**Returns:**

| Property | Type | Description |
|----------|------|-------------|
| `plugin` | `Function` | Pass to `Reactotron.use(plugin)` |
| `storage` | `MMKV` | Proxied MMKV instance for your app |

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
  stateNamespace: 'mmkv.user',
});

const cachePlugin = mmkvPlugin({
  storage: cacheStorage,
  stateNamespace: 'mmkv.cache',
});

Reactotron
  .use(userPlugin.plugin)
  .use(cachePlugin.plugin)
  .connect();
```

## How It Works

1. **Proxy Interception**: Your MMKV instance is wrapped in a JS `Proxy`. Every method call (`set`, `getString`, `delete`, etc.) is intercepted, logged to Reactotron, and then forwarded to the real MMKV instance.

2. **State Tab Protocol**: The plugin responds to Reactotron's state commands (`state.keys.request`, `state.values.request`, `state.values.subscribe`) to make MMKV data browsable in the State tab.

3. **Zero Production Overhead**: The proxy only logs when Reactotron is connected. In production (where Reactotron isn't configured), there is no performance impact.

## Contributing

```bash
# Clone the repo
git clone https://github.com/mohdrehan/reactotron-plugin-mmkv

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build
```

## License

MIT
