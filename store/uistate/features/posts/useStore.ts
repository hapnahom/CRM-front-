import { create } from 'zustand';
import { MyState } from './interface';
import createCounterSlice from './createCounterSlice';

const usePostStore = create<MyState>((set) => ({
  ...createCounterSlice(set),
}));

export default usePostStore;
