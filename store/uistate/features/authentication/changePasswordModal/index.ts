import { create } from 'zustand';

interface ModalState {
  error: string;
  success: string;
  isModalOpen: boolean;
  loading: boolean; // Add loading state
  setError: (error: string) => void;
  setSuccess: (success: string) => void;
  setLoading: (loading: boolean) => void; // Add setter for loading state
  openModal: () => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set) => ({
  error: '',
  success: '',
  isModalOpen: false,
  loading: false, // Initialize loading state
  setError: (error) => set({ error }),
  setSuccess: (success) => set({ success }),
  setLoading: (loading) => set({ loading }), // Setter for loading
  openModal: () => set({ isModalOpen: true }),
  closeModal: () =>
    set({
      isModalOpen: false,
      error: '',
      success: '',
      loading: false, // Reset loading state when closing modal
    }),
}));
