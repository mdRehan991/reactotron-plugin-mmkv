import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { storage } from '../services/storage';

export default function MmkvCard() {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [getResult, setGetResult] = useState<string | null>(null);

  const handleSet = () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a key');
      return;
    }
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
    storage.set('app.theme', 'dark');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    
    storage.set('user.profile', JSON.stringify({ name: 'John Doe', age: 30 }));
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    storage.set('analytics.enabled', true);
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    storage.getString('app.theme');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    storage.set('app.theme', 'light');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    storage.contains('user.profile');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    storage.delete('analytics.enabled');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    storage.set('session.tokens', JSON.stringify({
      access: 'jwt-access-token-12345',
      refresh: 'jwt-refresh-token-abcde',
      expiry: 1716300000000,
    }));
  };

  return (
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

      <View style={[styles.gridRow, { marginTop: 14 }]}>
        <TouchableOpacity style={[styles.utilButton, styles.stressBtn]} onPress={runStressTest}>
          <Text style={styles.buttonText}>⚡ Run Stress Test</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.utilButton, styles.clearBtn]} onPress={handleClearAll}>
          <Text style={styles.buttonText}>🗑️ Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
