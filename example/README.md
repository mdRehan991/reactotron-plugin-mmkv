# reactotron-plugin-mmkv Example App

This is a React Native app bootstrapped specifically to demonstrate and test `reactotron-plugin-mmkv`.

It contains an interactive UI to perform raw MMKV operations (SET, GET, DELETE, CLEAR_ALL) and monitor how they are intercepted, logged to the Reactotron timeline, and synchronised with the Reactotron State tab in real-time.

---

## Prerequisites

Before running the example, ensure you have:
1. Installed and started the [Reactotron Desktop App](https://github.com/infinitered/reactotron/releases).
2. Set up your React Native environment (CocoaPods for iOS, JDK/Android Studio for Android).
3. Set up the plugin. Ensure the parent directory is built:
   ```bash
   # From workspace root
   npm run build
   ```

---

## Installation & Setup

1. Navigate to the `example` folder and install dependencies:
   ```bash
   cd example
   npm install
   ```

2. **iOS Only**: Install native CocoaPods dependencies:
   ```bash
   cd ios
   bundle install
   bundle exec pod install
   cd ..
   ```

---

## Running the App

### Step 1: Start Metro
Start the Metro bundler:
```bash
npm start
```

### Step 2: Start the Application
In a separate terminal window, launch the application:

#### Android
```bash
npm run android
```

#### iOS
```bash
npm run ios
```

---

## Testing the Plugin features

1. **Verify Connection**: Launch the app. Once connected, Reactotron's Timeline will show a green `MMKV` category display event: **"✅ MMKV plugin connected"**.
2. **Timeline Logging**: 
   - Enter a Key and a Value in the inputs, and click **SET**.
   - Reactotron will log: `🟢 MMKV SET "your_key" → "your_value"`
   - Click **GET** on the same key. Reactotron will log: `🔵 MMKV GET "your_key" → "your_value"` (Since `logReads` is enabled in configuration).
   - Enter a new value for the same key and click **SET**. Reactotron will log: `🟡 MMKV UPDATE "your_key" → "new_value" (was "your_value")`
3. **State Tab Browsing**:
   - In Reactotron, navigate to the **State** tab.
   - You will see the `mmkvStore` namespace (configured in `App.tsx`). Click it to expand and browse the live keys and values of the MMKV storage.
   - In the app, click **⚡ Run Stress Test**. This triggers a rapid sequence of MMKV operations. You can watch the State tab and Timeline update instantly!
