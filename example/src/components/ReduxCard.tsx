import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, increment, decrement } from '../store';

export default function ReduxCard() {
  const dispatch = useDispatch();
  const counterValue = useSelector((state: RootState) => state.counter.value);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Redux State Operations</Text>
      <Text style={styles.reduxValue}>Counter Value: {counterValue}</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.incrementBtn]}
          onPress={() => dispatch(increment())}
        >
          <Text style={styles.buttonText}>INCREMENT</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.decrementBtn]}
          onPress={() => dispatch(decrement())}
        >
          <Text style={styles.buttonText}>DECREMENT</Text>
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
  reduxValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 14,
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
  incrementBtn: {
    backgroundColor: '#5856d6',
  },
  decrementBtn: {
    backgroundColor: '#ff9500',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
