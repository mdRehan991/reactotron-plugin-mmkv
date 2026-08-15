import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { basicStorage, proxyStorage } from '../services/storage';

export default function MmkvCard() {
  const [selectedMode, setSelectedMode] = useState<'basic' | 'proxy'>('basic');
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [getResult, setGetResult] = useState<string | null>(null);

  const activeStorage = selectedMode === 'basic' ? basicStorage : proxyStorage;

  const handleSet = () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a key');
      return;
    }
    activeStorage.set(key, value);
    setKey('');
    setValue('');
    setGetResult(null);
  };

  const handleGet = () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a key');
      return;
    }
    const exists = activeStorage.contains(key);
    if (!exists) {
      setGetResult('Key does not exist');
      return;
    }
    const val = activeStorage.getString(key) ?? activeStorage.getNumber(key) ?? activeStorage.getBoolean(key);
    setGetResult(val !== undefined ? String(val) : 'null');
  };

  const handleDelete = () => {
    if (!key.trim()) {
      Alert.alert('Error', 'Please enter a key');
      return;
    }
    activeStorage.delete(key);
    setKey('');
    setGetResult(null);
  };

  const handleClearAll = () => {
    activeStorage.clearAll();
    setKey('');
    setValue('');
    setGetResult(null);
  };

  const runStressTest = async () => {
    console.log(`Starting MMKV Reactotron plugin stress test on ${selectedMode} storage...`);
    activeStorage.set('app.theme', 'dark');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    
    activeStorage.set('user.profile', JSON.stringify({ name: 'John Doe', age: 30 }));
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    activeStorage.set('analytics.enabled', true);
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    activeStorage.getString('app.theme');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    activeStorage.set('app.theme', 'light');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    activeStorage.contains('user.profile');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    activeStorage.delete('analytics.enabled');
    await new Promise<void>((resolve) => setTimeout(resolve, 300));

    activeStorage.set('session.tokens', JSON.stringify({
      access: 'jwt-access-token-12345',
      refresh: 'jwt-refresh-token-abcde',
      expiry: 1716300000000,
    }));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>MMKV Operations</Text>

      {/* Target Storage Selector */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, selectedMode === 'basic' && styles.toggleBtnActive]}
          onPress={() => {
            setSelectedMode('basic');
            setGetResult(null);
          }}
        >
          <Text style={[styles.toggleBtnText, selectedMode === 'basic' && styles.toggleBtnTextActive]}>
            Basic (mode: basic)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, selectedMode === 'proxy' && styles.toggleBtnActive]}
          onPress={() => {
            setSelectedMode('proxy');
            setGetResult(null);
          }}
        >
          <Text style={[styles.toggleBtnText, selectedMode === 'proxy' && styles.toggleBtnTextActive]}>
            Proxy (mode: proxy)
          </Text>
        </TouchableOpacity>
      </View>
      
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#121214',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#ff9500',
  },
  toggleBtnText: {
    color: '#8a8a93',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
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
