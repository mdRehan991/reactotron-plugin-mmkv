/**
 * @format
 */

jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      set: jest.fn(),
      getString: jest.fn(),
      getNumber: jest.fn(),
      getBoolean: jest.fn(),
      contains: jest.fn(),
      delete: jest.fn(),
      clearAll: jest.fn(),
      getAllKeys: jest.fn().mockReturnValue([]),
      addOnValueChangedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
    })),
  };
});

jest.mock('reactotron-react-native', () => ({
  configure: jest.fn().mockReturnThis(),
  useReactNative: jest.fn().mockReturnThis(),
  use: jest.fn().mockReturnThis(),
  connect: jest.fn().mockReturnThis(),
  createEnhancer: jest.fn().mockReturnValue((createStore: any) => createStore),
}));

jest.mock('../src/config/reactotron', () => ({}));

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/App';

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
