export interface CounterSlice {
  counter: number;
  incrementCounter: () => void;
  decrementCounter: () => void;
}

export type MyState = CounterSlice;
