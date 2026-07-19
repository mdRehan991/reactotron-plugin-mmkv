import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { storage } from '../services/storage';

export default function StorageState() {
  const [keysList, setKeysList] = useState<string[]>(storage.getAllKeys());

  useEffect(() => {
    const listener = storage.addOnValueChangedListener(() => {
      setKeysList(storage.getAllKeys());
    });
    return () => listener.remove();
  }, []);

  return (
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
