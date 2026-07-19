import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Alert,
} from 'react-native';
import Reactotron from 'reactotron-react-native';
import { mmkvPlugin } from 'reactotron-plugin-mmkv';
import { MMKV } from 'react-native-mmkv';

// 1. Initialize the raw MMKV storage instance
const rawStorage = new MMKV({ id: 'reactotron-example' });

// 2. Wrap it with the mmkvPlugin. We enable logReads and logContains to show
// how the plugin logs ALL operations, not just writes.
const { plugin, storage } = mmkvPlugin({
  storage: rawStorage,
  logReads: true,
  logContains: true,
  stateNamespace: 'mmkvStore',
});

// 3. Configure Reactotron to connect to your Reactotron GUI app
Reactotron
  .configure({ name: 'MMKV Plugin Example' })
  .useReactNative()
  .use(plugin)
  .connect();

export default function App() {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [getResult, setGetResult] = useState<string | null>(null);
  const [keysList, setKeysList] = useState<string[]>(storage.getAllKeys());

  // Listen for storage changes to refresh the local keys list
  useEffect(() => {
    const listener = storage.addOnValueChangedListener(() => {
      setKeysList(storage.getAllKeys());
    });
    return () => listener.remove();
  }, []);

  const handleSet = () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a key');
      return;
    }
    // Set string or number/boolean based on input
    storage.set(key, value);
    setKey('');
    setValue('');
    setGetResult(null);
  };

  const handleGet = () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a key');
      return;
    }
    const exists = storage.contains(key);
    if (!exists) {
      setGetResult('Key does not exist');
      return;
    }
    const val = storage.getString(key) ?? storage.getNumber(key) ?? storage.getBoolean(key);
    setGetResult(val !== undefined ? String(val) : 'null');
  };

  const handleDelete = () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a key');
      return;
    }
    storage.delete(key);
    setKey('');
    setGetResult(null);
  };

  const handleClearAll = () => {
    storage.clearAll();
    setKey('');
    setValue('');
    setGetResult(null);
  };

  const runStressTest = async () => {
    console.log('Starting MMKV Reactotron plugin stress test...');
    
    // Step 1: SET multiple values
    storage.set('app.theme', 'dark');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    
    storage.set('user.profile', JSON.stringify({ name: 'John Doe', age: 30 }));
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    storage.set('analytics.enabled', true);
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    // Step 2: GET values (logs GET operations)
    storage.getString('app.theme');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    // Step 3: UPDATE an existing value
    storage.set('app.theme', 'light');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    // Step 4: CONTAINS check
    storage.contains('user.profile');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    // Step 5: DELETE a key
    storage.delete('analytics.enabled');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    // Step 6: Add complex objects to demonstrate State Tab browsing
    storage.set('session.tokens', JSON.stringify({
      access: 'jwt-access-token-12345',
      refresh: 'jwt-refresh-token-abcde',
      expiry: 1716300000000,
    }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e24" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reactotron MMKV Plugin</Text>
        <Text style={styles.headerSubtitle}>Interactive Testbed & Demo App</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>MMKV Key-Value Operations</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Enter Key (e.g. app.theme)"
            placeholderTextColor="#8a8a93"
            value={key}
            onChangeText={setKey}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter Value (e.g. dark)"
            placeholderTextColor="#8a8a93"
            value={value}
            onChangeText={setValue}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.setBtn]} onPress={handleSet}>
              <Text style={styles.buttonText}>SET</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.getBtn]} onPress={handleGet}>
              <Text style={styles.buttonText}>GET</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.deleteBtn]} onPress={handleDelete}>
              <Text style={styles.buttonText}>DELETE</Text>
            </TouchableOpacity>
          </View>

          {getResult !== null && (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>GET Result:</Text>
              <Text style={styles.resultText}>{getResult}</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Automation & Utilities</Text>
          <View style={styles.gridRow}>
            <TouchableOpacity style={[styles.utilButton, styles.stressBtn]} onPress={runStressTest}>
              <Text style={styles.buttonText}>⚡ Run Stress Test</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.utilButton, styles.clearBtn]} onPress={handleClearAll}>
              <Text style={styles.buttonText}>🗑️ Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active MMKV Storage State ({keysList.length} Keys)</Text>
          {keysList.length === 0 ? (
            <Text style={styles.emptyText}>Storage is currently empty. Use SET or run a stress test to add values.</Text>
          ) : (
            keysList.map((k) => {
              let displayVal = 'Unknown type';
              try {
                displayVal = storage.getString(k) ?? String(storage.getNumber(k) ?? storage.getBoolean(k));
              } catch {
                displayVal = 'Error reading value';
              }
              return (
                <View key={k} style={styles.listItem}>
                  <Text style={styles.listKey}>{k}</Text>
                  <Text style={styles.listValue} numberOfLines={1}>
                    {displayVal}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121214',
  },
  header: {
    backgroundColor: '#1e1e24',
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b36',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8a8a93',
    marginTop: 4,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1e1e24',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2b2b36',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 14,
  },
  input: {
    backgroundColor: '#121214',
    borderWidth: 1,
    borderColor: '#2b2b36',
    borderRadius: 8,
    padding: 12,
    color: '#ffffff',
    fontSize: 15,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setBtn: {
    backgroundColor: '#34c759',
  },
  getBtn: {
    backgroundColor: '#007aff',
  },
  deleteBtn: {
    backgroundColor: '#ff9500',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resultBox: {
    backgroundColor: '#121214',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#007aff',
  },
  resultLabel: {
    fontSize: 12,
    color: '#8a8a93',
    marginBottom: 2,
  },
  resultText: {
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Courier',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  utilButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stressBtn: {
    backgroundColor: '#5856d6',
  },
  clearBtn: {
    backgroundColor: '#ff3b30',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2b2b36',
  },
  listKey: {
    fontSize: 14,
    fontWeight: '500',
    color: '#34c759',
    flex: 0.4,
  },
  listValue: {
    fontSize: 14,
    color: '#d1d1d6',
    flex: 0.6,
    textAlign: 'right',
    fontFamily: 'Courier',
  },
  emptyText: {
    color: '#8a8a93',
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 12,
  },
});
