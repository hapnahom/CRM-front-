import { create } from 'zustand';
import {
  Lead,
  CreateLeadRequest,
  UpdateLeadStageRequest,
} from '@/store/server/features/leads/interface';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { CRM_URL } from '@/utils/constants';

interface LeadActions {
  // Lead CRUD Actions
  createLead: (leadData: CreateLeadRequest) => Promise<Lead | null>;
  updateLead: (leadId: number, leadData: Partial<Lead>) => Promise<Lead | null>;
  deleteLead: (leadId: number) => Promise<boolean>;

  // Lead Stage Actions
  updateLeadStage: (data: UpdateLeadStageRequest) => Promise<boolean>;

  // Bulk Actions
  deleteMultipleLeads: (leadIds: number[]) => Promise<boolean>;

  // Search and Filter Actions
  searchLeads: (searchTerm: string) => Promise<Lead[]>;
  filterLeads: (filters: any) => Promise<Lead[]>;

  // Export Actions
  exportLeads: (filters?: Record<string, any>) => Promise<void>;

  // Loading States
  loading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useLeadActions = create<LeadActions>((set) => ({
  // Initial state
  loading: false,
  error: null,

  // Lead CRUD Actions
  createLead: async (leadData: CreateLeadRequest) => {
    try {
      set({ loading: true, error: null });
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;

      if (!tenantId) {
        throw new Error(
          'Tenant ID not found. Please ensure you are properly authenticated.',
        );
      }

      const headers = {
        tenantId: tenantId,
        Authorization: `Bearer ${token}`,
      };

      const response = await crudRequest({
        url: `${CRM_URL}/leads`,
        method: 'POST',
        headers,
        data: {
          ...leadData,
          tenantId,
        },
      });

      set({ loading: false });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to create lead';
      set({ loading: false, error: errorMessage });
      return null;
    }
  },

  updateLead: async (leadId: number, leadData: Partial<Lead>) => {
    try {
      set({ loading: true, error: null });
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;

      if (!tenantId) {
        throw new Error(
          'Tenant ID not found. Please ensure you are properly authenticated.',
        );
      }

      const headers = {
        tenantId: tenantId,
        Authorization: `Bearer ${token}`,
      };

      const response = await crudRequest({
        url: `${CRM_URL}/leads/${leadId}`,
        method: 'PUT',
        headers,
        data: leadData,
      });

      set({ loading: false });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to update lead';
      set({ loading: false, error: errorMessage });
      return null;
    }
  },

  deleteLead: async (leadId: number) => {
    try {
      set({ loading: true, error: null });
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;

      if (!tenantId) {
        throw new Error(
          'Tenant ID not found. Please ensure you are properly authenticated.',
        );
      }

      const headers = {
        tenantId: tenantId,
        Authorization: `Bearer ${token}`,
      };

      await crudRequest({
        url: `${CRM_URL}/leads/${leadId}`,
        method: 'DELETE',
        headers,
      });

      set({ loading: false });
      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to delete lead';
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  // Lead Stage Actions
  updateLeadStage: async (data: UpdateLeadStageRequest) => {
    try {
      set({ loading: true, error: null });
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;

      if (!tenantId) {
        throw new Error(
          'Tenant ID not found. Please ensure you are properly authenticated.',
        );
      }

      const headers = {
        tenantId: tenantId,
        Authorization: `Bearer ${token}`,
      };

      await crudRequest({
        url: `${CRM_URL}/leads/${data.leadId}/stage`,
        method: 'PATCH',
        headers,
        data: {
          stageId: data.stageId,
        },
      });

      set({ loading: false });
      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to update lead stage';
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  // Bulk Actions
  deleteMultipleLeads: async (leadIds: number[]) => {
    try {
      set({ loading: true, error: null });
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;

      if (!tenantId) {
        throw new Error(
          'Tenant ID not found. Please ensure you are properly authenticated.',
        );
      }

      const headers = {
        tenantId: tenantId,
        Authorization: `Bearer ${token}`,
      };

      await crudRequest({
        url: `${CRM_URL}/leads/bulk-delete`,
        method: 'POST',
        headers,
        data: { leadIds },
      });

      set({ loading: false });
      return true;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to delete leads';
      set({ loading: false, error: errorMessage });
      return false;
    }
  },

  // Search and Filter Actions
  searchLeads: async (searchTerm: string) => {
    try {
      set({ loading: true, error: null });
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;

      if (!tenantId) {
        throw new Error(
          'Tenant ID not found. Please ensure you are properly authenticated.',
        );
      }

      const headers = {
        tenantId: tenantId,
        Authorization: `Bearer ${token}`,
      };

      const response = await crudRequest({
        url: `${CRM_URL}/leads`,
        method: 'GET',
        headers,
        params: { search: searchTerm },
      });

      set({ loading: false });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to search leads';
      set({ loading: false, error: errorMessage });
      return [];
    }
  },

  filterLeads: async (filters: any) => {
    try {
      set({ loading: true, error: null });
      const token = await getCurrentToken();
      const tenantId = useAuthenticationStore.getState().tenantId;

      if (!tenantId) {
        throw new Error(
          'Tenant ID not found. Please ensure you are properly authenticated.',
        );
      }

      const headers = {
        tenantId: tenantId,
        Authorization: `Bearer ${token}`,
      };

      const response = await crudRequest({
        url: `${CRM_URL}/leads`,
        method: 'GET',
        headers,
        params: filters,
      });

      set({ loading: false });
      return response;
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to filter leads';
      set({ loading: false, error: errorMessage });
      return [];
    }
  },

  // Export is disabled until a dedicated export task wires it to the new pipeline UI.
  exportLeads: async () => {
    return;
  },

  // Loading States
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));
