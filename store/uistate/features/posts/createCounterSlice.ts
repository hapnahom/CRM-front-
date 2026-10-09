import { SetState } from 'zustand';
import { MyState } from './interface';

const counter = 0;
const createCounterSlice = (set: SetState<MyState>) => ({
  counter,
  incrementCounter: () =>
    set((state: { counter: number }) => ({ counter: state.counter + 1 })),
  decrementCounter: () =>
    set((state: { counter: number }) => ({ counter: state.counter - 1 })),
});

export default createCounterSlice;
