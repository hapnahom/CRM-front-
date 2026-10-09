import { useQuery } from 'react-query';
import { crudRequest } from '@/utils/crudRequest';
import {
  partnersAuthHeaders,
  PARTNERS_URL,
  PARTNER_ROLES_URL,
  PARTNER_TIERS_URL,
  PARTNER_PARTNERSHIP_TYPES_URL,
  PARTNER_CERTIFICATIONS_URL,
  ENTITY_FIELDS_URL,
  retryUnlessUnauthorized,
  unwrapList,
} from './api';
import type {
  PaginatedPartnersApi,
  PartnerApi,
  PartnerListFilters,
  PartnerPartnershipTypeApi,
  PartnerRoleApi,
  PartnerTierApi,
} from './types';
import {
  mapPartnerListItem,
  mapPartnerPartnershipType,
  mapPartnerRole,
  mapPartnerTier,
} from './mappers';
import type { CertificationRecord, Partner } from '@/modules/partners/types';
import type { PartnerRole } from '@/modules/partners/roles/types';
import type { PartnerTierDefinition } from '@/modules/partners/tiers/types';
import type { PartnerPartnershipTypeDefinition } from '@/modules/partners/partnership-types/types';

/** Shape returned by GET /partners/performance — won amounts per partner per currency. */
export type PartnerPerformanceResponse = {
  wonByPartnerId: Record<string, Record<string, number>>;
};

export const partnerKeys = {
  all: ['partners'] as const,
  list: (filters: PartnerListFilters) => ['partners', 'list', filters] as const,
  detail: (id: string) => ['partners', 'detail', id] as const,
  accessScope: ['partners', 'access-scope'] as const,
  roles: ['partner-roles'] as const,
  tiers: ['partner-tiers'] as const,
  partnershipTypes: ['partner-partnership-types'] as const,
  roleFields: (roleId: string) => ['partner-role-fields', roleId] as const,
  fieldsForRoles: (roleIds: string[]) =>
    ['partner-fields-for-roles', ...roleIds.sort()] as const,
  performance: ['partners', 'performance'] as const,
  certifications: (partnerId?: string) =>
    ['partner-certifications', partnerId ?? 'all'] as const,
};

export type PartnerAccessScopeApi = {
  level: 'all' | 'product-family';
  productFamilyIds: string[];
  productFamilies: Array<{ id: string; name: string }>;
  partnerIds: string[] | null;
  scopeLabel: string;
};

export function usePartnerAccessScope() {
  return useQuery(
    partnerKeys.accessScope,
    async () => {
      const headers = await partnersAuthHeaders();
      return (await crudRequest({
        url: `${PARTNERS_URL}/access-scope`,
        method: 'GET',
        headers,
      })) as PartnerAccessScopeApi;
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function usePartners(filters: PartnerListFilters = {}) {
  return useQuery(
    partnerKeys.list(filters),
    async () => {
      const headers = await partnersAuthHeaders();
      const params: Record<string, string> = {};
      if (filters.page) params.page = String(filters.page);
      if (filters.pageSize) params.pageSize = String(filters.pageSize);
      if (filters.search) params.search = filters.search;
      if (filters.roleId) params.roleId = filters.roleId;

      const raw = await crudRequest({
        url: PARTNERS_URL,
        method: 'GET',
        headers,
        params,
      });

      const paginated = raw as PaginatedPartnersApi;
      const rows = paginated?.data ?? unwrapList<PartnerApi>(raw);
      return {
        partners: rows.map(mapPartnerListItem) as Partner[],
        pagination: paginated?.pagination,
      };
    },
    {
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function usePartner(id: string | undefined) {
  return useQuery(
    partnerKeys.detail(id ?? ''),
    async () => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNERS_URL}/${id}`,
        method: 'GET',
        headers,
      });
      return mapPartnerListItem(raw as PartnerApi);
    },
    {
      enabled: Boolean(id),
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function usePartnerRolesQuery() {
  return useQuery(
    partnerKeys.roles,
    async () => {
      const headers = await partnersAuthHeaders();
      const rows = unwrapList<PartnerRoleApi>(
        await crudRequest({
          url: PARTNER_ROLES_URL,
          method: 'GET',
          headers,
        }),
      );
      return rows.map(mapPartnerRole) as PartnerRole[];
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function usePartnerTiersQuery() {
  return useQuery(
    partnerKeys.tiers,
    async () => {
      const headers = await partnersAuthHeaders();
      const rows = unwrapList<PartnerTierApi>(
        await crudRequest({
          url: PARTNER_TIERS_URL,
          method: 'GET',
          headers,
        }),
      );
      return rows.map(mapPartnerTier) as PartnerTierDefinition[];
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function usePartnerPartnershipTypesQuery() {
  return useQuery(
    partnerKeys.partnershipTypes,
    async () => {
      const headers = await partnersAuthHeaders();
      const rows = unwrapList<PartnerPartnershipTypeApi>(
        await crudRequest({
          url: PARTNER_PARTNERSHIP_TYPES_URL,
          method: 'GET',
          headers,
        }),
      );
      return rows.map(
        mapPartnerPartnershipType,
      ) as PartnerPartnershipTypeDefinition[];
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function useFieldsForPartnerRolesQuery(roleIds: string[]) {
  return useQuery(
    partnerKeys.fieldsForRoles(roleIds),
    async () => {
      if (!roleIds.length) return [];
      const headers = await partnersAuthHeaders();
      const qs = roleIds
        .map((id) => `roleIds=${encodeURIComponent(id)}`)
        .join('&');
      const raw = await crudRequest({
        url: `${ENTITY_FIELDS_URL}/for-partner-roles?${qs}`,
        method: 'GET',
        headers,
      });
      const fields = (raw as { fields?: unknown[] })?.fields ?? [];
      return fields;
    },
    {
      enabled: roleIds.length > 0,
      staleTime: 15_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export function resolveRoleIdByCode(
  roles: PartnerRole[],
  code: string,
): string | undefined {
  return roles.find((r) => r.code === code)?.id;
}

export function usePartnerPerformance() {
  return useQuery(
    partnerKeys.performance,
    async () => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: `${PARTNERS_URL}/performance`,
        method: 'GET',
        headers,
      });
      return raw as PartnerPerformanceResponse;
    },
    {
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}

export type PartnerCertificationApi = {
  id: string;
  partnerId: string;
  partnerName?: string;
  certificationName: string;
  vendor: string;
  productOrSolution: string | null;
  certifiedIndividual: string;
  certificationLevel: string;
  issueDate: string;
  expiryDate: string;
  status: CertificationRecord['status'];
  daysUntilExpiry: number;
  certificateUrl: string | null;
};

function mapCertification(api: PartnerCertificationApi): CertificationRecord {
  return {
    id: api.id,
    certificationName: api.certificationName,
    productOrSolution: api.productOrSolution ?? '',
    partnerId: api.partnerId,
    // API still stores legacy `vendor`; prefer partnerName when present.
    partnerName: api.partnerName?.trim() || api.vendor || '',
    certifiedIndividual: api.certifiedIndividual,
    certificationLevel:
      (api.certificationLevel as CertificationRecord['certificationLevel']) ??
      'Professional',
    issueDate: api.issueDate,
    expiryDate: api.expiryDate,
    status: api.status,
    daysUntilExpiry: api.daysUntilExpiry,
    certificateUrl: api.certificateUrl ?? undefined,
  };
}

/** Partner certifications, optionally scoped to one partner. */
export function usePartnerCertifications(partnerId?: string, enabled = true) {
  return useQuery(
    partnerKeys.certifications(partnerId),
    async () => {
      const headers = await partnersAuthHeaders();
      const raw = await crudRequest({
        url: partnerId
          ? `${PARTNER_CERTIFICATIONS_URL}?partnerId=${encodeURIComponent(partnerId)}`
          : PARTNER_CERTIFICATIONS_URL,
        method: 'GET',
        headers,
      });
      const rows = unwrapList<PartnerCertificationApi>(raw);
      return rows.map(mapCertification);
    },
    {
      enabled,
      staleTime: 30_000,
      retry: retryUnlessUnauthorized,
    },
  );
}
