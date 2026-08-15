import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import Reactotron from 'reactotron-react-native';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state, action: PayloadAction<number | undefined>) => {
      state.value += action.payload ?? 1;
    },
    decrement: (state, action: PayloadAction<number | undefined>) => {
      state.value -= action.payload ?? 1;
    },
    setValue: (state, action: PayloadAction<number>) => {
      state.value = action.payload;
    },
  },
});

export const { increment, decrement, setValue } = counterSlice.actions;

export const store = configureStore({
  reducer: {
    counter: counterSlice.reducer,
  },
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat((Reactotron as any).createEnhancer()),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
