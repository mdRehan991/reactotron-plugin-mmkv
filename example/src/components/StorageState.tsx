import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { rawBasicStorage, rawProxyStorage } from '../services/storage';

export default function StorageState() {
  const [basicKeys, setBasicKeys] = useState<string[]>(rawBasicStorage.getAllKeys());
  const [proxyKeys, setProxyKeys] = useState<string[]>(rawProxyStorage.getAllKeys());

  useEffect(() => {
    const basicListener = rawBasicStorage.addOnValueChangedListener(() => {
      setBasicKeys(rawBasicStorage.getAllKeys());
    });
    const proxyListener = rawProxyStorage.addOnValueChangedListener(() => {
      setProxyKeys(rawProxyStorage.getAllKeys());
    });
    return () => {
      basicListener.remove();
      proxyListener.remove();
    };
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Active MMKV Storage State</Text>

      <Text style={styles.sectionHeader}>Basic Storage ({basicKeys.length} Keys)</Text>
      {basicKeys.length === 0 ? (
        <Text style={styles.emptyText}>Basic storage is empty.</Text>
      ) : (
        basicKeys.map((k) => {
          let displayVal = 'Unknown type';
          try {
            displayVal = rawBasicStorage.getString(k) ?? String(rawBasicStorage.getNumber(k) ?? rawBasicStorage.getBoolean(k));
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

      <Text style={styles.proxySectionHeader}>Proxy Storage ({proxyKeys.length} Keys)</Text>
      {proxyKeys.length === 0 ? (
        <Text style={styles.emptyText}>Proxy storage is empty.</Text>
      ) : (
        proxyKeys.map((k) => {
          let displayVal = 'Unknown type';
          try {
            displayVal = rawProxyStorage.getString(k) ?? String(rawProxyStorage.getNumber(k) ?? rawProxyStorage.getBoolean(k));
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
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ff9500',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  proxySectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ff9500',
    marginTop: 20,
    marginBottom: 6,
    letterSpacing: 0.5,
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
