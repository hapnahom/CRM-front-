import { useQuery } from 'react-query';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { fetchAllPipelineLeads } from '@/store/server/features/leads/pipeline/queries';
import { fetchAllPipelineDeals } from '@/store/server/features/deals/pipeline/queries';
import type { Partner } from '@/modules/partners/types';
import {
  enrichPartnersWithRegistrationPipeline,
  extractDealRegistrations,
} from '@/modules/partners/utils/deal-registrations';

/**
 * Aggregates deal registrations from lead/deal solution vendors for the Partners module.
 *
 * Includes intentional registrations only (UI Deal Registration fields and
 * Excel-migrated DR Status values such as approved/pending/active/declined).
 * Blank Not Registered / Not Required vendor lines are excluded.
 */
export function useDealRegistrations(partners: Partner[]) {
  const tenantId = useAuthenticationStore((state) => state.tenantId);

  const query = useQuery({
    queryKey: ['partner-deal-registrations', tenantId],
    queryFn: async () => {
      const [leads, deals] = await Promise.all([
        fetchAllPipelineLeads(),
        fetchAllPipelineDeals(),
      ]);
      return { leads, deals };
    },
    enabled: Boolean(tenantId),
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const registrations = extractDealRegistrations({
    leads: query.data?.leads ?? [],
    deals: query.data?.deals ?? [],
    partners,
  });

  const partnersWithPipeline = enrichPartnersWithRegistrationPipeline(
    partners,
    registrations,
  );

  return {
    ...query,
    registrations,
    partnersWithPipeline,
  };
}
