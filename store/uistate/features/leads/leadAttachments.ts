import { create } from 'zustand';
import { UploadFile } from 'antd/es/upload/interface';

interface LeadAttachmentsState {
  // File list for the current lead
  fileList: UploadFile[];
  setFileList: (fileList: UploadFile[]) => void;

  // Upload loading state
  isUploading: boolean;
  setIsUploading: (isUploading: boolean) => void;

  // Clear all state
  clearState: () => void;
}

export const useLeadAttachmentsStore = create<LeadAttachmentsState>((set) => ({
  fileList: [],
  setFileList: (fileList: UploadFile[]) => set({ fileList }),

  isUploading: false,
  setIsUploading: (isUploading: boolean) => set({ isUploading }),

  clearState: () => set({ fileList: [], isUploading: false }),
}));
