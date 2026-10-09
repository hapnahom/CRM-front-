import { useMutation, useQueryClient } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import {
  partnersAuthHeaders,
  PARTNERS_URL,
  PARTNER_ROLES_URL,
  PARTNER_TIERS_URL,
  PARTNER_PARTNERSHIP_TYPES_URL,
  PARTNER_CERTIFICATIONS_URL,
  ENTITY_FIELDS_URL,
} from './api';
import { partnerKeys } from './queries';
import type {
  CreatePartnerPayload,
  UpdatePartnerPayload,
  CreatePartnerRolePayload,
  UpdatePartnerRolePayload,
  CreatePartnerTierPayload,
  UpdatePartnerTierPayload,
  CreatePartnerPartnershipTypePayload,
  UpdatePartnerPartnershipTypePayload,
  PartnerApi,
  PartnerRoleApi,
  PartnerTierApi,
  PartnerPartnershipTypeApi,
} from './types';
import {
  mapPartnerListItem,
  mapPartnerPartnershipType,
  mapPartnerRole,
  mapPartnerTier,
} from './mappers';
import type {
  CreateEntityFieldRequest,
  UpdateEntityFieldRequest,
} from '@/store/server/features/entity-fields/types';

type CertificationPayload = {
  partnerId: string;
  certificationName: string;
  vendor: string;
  productOrSolution?: string | null;
  certifiedIndividual: string;
  certificationLevel?: string;
  issueDate?: string | null;
  expiryDate?: string | null;
  certificateUrl?: string | null;
};

function invalidatePartnerCertifications(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  queryClient.invalidateQueries({ queryKey: ['partner-certifications'] });
}

function invalidatePartners(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: partnerKeys.all });
  queryClient.invalidateQueries({ queryKey: partnerKeys.roles });
  queryClient.invalidateQueries({ queryKey: partnerKeys.tiers });
  queryClient.invalidateQueries({ queryKey: partnerKeys.partnershipTypes });
  invalidatePartnerCertifications(queryClient);
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePartnerPayload) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: PARTNERS_URL,
        method: 'POST',
        headers,
        data: payload,
      });
      return mapPartnerListItem(raw as PartnerApi);
    },
    onSuccess: () => invalidatePartners(queryClient),
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePartnerPayload;
    }) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNERS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
      return mapPartnerListItem(raw as PartnerApi);
    },
    onSuccess: (partner) => {
      invalidatePartners(queryClient);
      queryClient.invalidateQueries({
        queryKey: partnerKeys.detail(partner.id),
      });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: `${PARTNERS_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => invalidatePartners(queryClient),
  });
}

export function useCreatePartnerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePartnerRolePayload) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: PARTNER_ROLES_URL,
        method: 'POST',
        headers,
        data: payload,
      });
      return mapPartnerRole(raw as PartnerRoleApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.roles });
    },
  });
}

export function useUpdatePartnerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePartnerRolePayload;
    }) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_ROLES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
      return mapPartnerRole(raw as PartnerRoleApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.roles });
    },
  });
}

export function useActivatePartnerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_ROLES_URL}/${id}/activate`,
        method: 'PATCH',
        headers,
      });
      return mapPartnerRole(raw as PartnerRoleApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.roles });
    },
  });
}

export function useDeactivatePartnerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_ROLES_URL}/${id}/deactivate`,
        method: 'PATCH',
        headers,
      });
      return mapPartnerRole(raw as PartnerRoleApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.roles });
    },
  });
}

export function useDeletePartnerRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: `${PARTNER_ROLES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.roles });
    },
  });
}

export function useCreatePartnerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePartnerTierPayload) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: PARTNER_TIERS_URL,
        method: 'POST',
        headers,
        data: payload,
      });
      return mapPartnerTier(raw as PartnerTierApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.tiers });
      queryClient.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useUpdatePartnerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePartnerTierPayload;
    }) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_TIERS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
      return mapPartnerTier(raw as PartnerTierApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.tiers });
      queryClient.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useActivatePartnerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_TIERS_URL}/${id}/activate`,
        method: 'PATCH',
        headers,
      });
      return mapPartnerTier(raw as PartnerTierApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.tiers });
    },
  });
}

export function useDeactivatePartnerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_TIERS_URL}/${id}/deactivate`,
        method: 'PATCH',
        headers,
      });
      return mapPartnerTier(raw as PartnerTierApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.tiers });
    },
  });
}

export function useDeletePartnerTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: `${PARTNER_TIERS_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.tiers });
      // Partners referencing the deleted tier have their tier cleared.
      queryClient.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useCreatePartnerPartnershipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreatePartnerPartnershipTypePayload) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: PARTNER_PARTNERSHIP_TYPES_URL,
        method: 'POST',
        headers,
        data: payload,
      });
      return mapPartnerPartnershipType(raw as PartnerPartnershipTypeApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.partnershipTypes });
      queryClient.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useUpdatePartnerPartnershipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePartnerPartnershipTypePayload;
    }) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_PARTNERSHIP_TYPES_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
      return mapPartnerPartnershipType(raw as PartnerPartnershipTypeApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.partnershipTypes });
      queryClient.invalidateQueries({ queryKey: partnerKeys.all });
    },
  });
}

export function useActivatePartnerPartnershipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_PARTNERSHIP_TYPES_URL}/${id}/activate`,
        method: 'PATCH',
        headers,
      });
      return mapPartnerPartnershipType(raw as PartnerPartnershipTypeApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.partnershipTypes });
    },
  });
}

export function useDeactivatePartnerPartnershipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNER_PARTNERSHIP_TYPES_URL}/${id}/deactivate`,
        method: 'PATCH',
        headers,
      });
      return mapPartnerPartnershipType(raw as PartnerPartnershipTypeApi);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.partnershipTypes });
    },
  });
}

export function useDeletePartnerPartnershipType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: `${PARTNER_PARTNERSHIP_TYPES_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partnerKeys.partnershipTypes });
    },
  });
}

export function useCreatePartnerRoleField(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateEntityFieldRequest) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: ENTITY_FIELDS_URL,
        method: 'POST',
        headers,
        data: {
          ...payload,
          entityType: 'PARTNER',
          scopeKind: 'PARTNER_ROLE',
          scopeId: roleId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: partnerKeys.roleFields(roleId),
      });
      queryClient.invalidateQueries({ queryKey: ['entityFields'] });
    },
  });
}

export function useCreatePartnerCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CertificationPayload) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: PARTNER_CERTIFICATIONS_URL,
        method: 'POST',
        headers,
        data: payload,
      });
    },
    onSuccess: () => {
      invalidatePartnerCertifications(queryClient);
      invalidatePartners(queryClient);
    },
  });
}

export function useUpdatePartnerCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<CertificationPayload>;
    }) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: `${PARTNER_CERTIFICATIONS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    onSuccess: () => {
      invalidatePartnerCertifications(queryClient);
    },
  });
}

export function useDeletePartnerCertification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: `${PARTNER_CERTIFICATIONS_URL}/${id}`,
        method: 'DELETE',
        headers,
      });
    },
    onSuccess: () => {
      invalidatePartnerCertifications(queryClient);
      invalidatePartners(queryClient);
    },
  });
}

export function useUpdatePartnerRoleField(roleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateEntityFieldRequest;
    }) => {
      const headers = await partnersAuthHeaders();
      return crudRequest({
        url: `${ENTITY_FIELDS_URL}/${id}`,
        method: 'PATCH',
        headers,
        data: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: partnerKeys.roleFields(roleId),
      });
      queryClient.invalidateQueries({ queryKey: ['entityFields'] });
    },
  });
}
