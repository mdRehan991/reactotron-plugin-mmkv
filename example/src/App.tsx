import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Provider } from 'react-redux';
import './config/reactotron'; // Side effect: configures and connects Reactotron
import { store } from './store';
import ReduxCard from './components/ReduxCard';
import MmkvCard from './components/MmkvCard';
import StorageState from './components/StorageState';

function AppContent() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e1e24" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reactotron MMKV + Redux</Text>
        <Text style={styles.headerSubtitle}>Senior-Level Decoupled Architecture</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <ReduxCard />
        <MmkvCard />
        <StorageState />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
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
});
