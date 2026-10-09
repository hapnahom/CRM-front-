// useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PaymentStore {
  paymentCurrency: string;
  setPaymentCurrency: (currency: string) => void;
}

export const usePaymentStore = create<PaymentStore>()(
  persist(
    (set) => ({
      paymentCurrency: 'USD',
      setPaymentCurrency: (currency) => set({ paymentCurrency: currency }),
    }),
    {
      name: 'payment-storage', // Key for localStorage
    },
  ),
);
