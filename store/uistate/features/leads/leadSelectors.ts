import { create } from 'zustand';
import { Lead } from '@/store/server/features/leads/interface';

interface LeadSelectors {
  // Basic Selectors
  getSelectedLeads: (leads: Lead[]) => Lead[];
  getLeadById: (leads: Lead[], id: string) => Lead | undefined;

  // Filter Selectors
  getLeadsByStage: (leads: Lead[], stageId: string) => Lead[];
  getLeadsByCompany: (leads: Lead[], companyId: string) => Lead[];
  getLeadsBySource: (leads: Lead[], sourceId: string) => Lead[];
  getLeadsBySector: (leads: Lead[], sectorId: string) => Lead[];
  getLeadsByRating: (
    leads: Lead[],
    ratingFilter: number | { min?: number; max?: number; exact?: number },
  ) => Lead[];
  getLeadsBySearchTerm: (leads: Lead[], searchTerm: string) => Lead[];

  // Computed Selectors
  getLeadsCount: (leads: Lead[]) => number;
  getLeadsByStageCount: (leads: Lead[]) => Record<string, number>;
  getLeadsByCompanyCount: (leads: Lead[]) => Record<string, number>;
  getLeadsBySourceCount: (leads: Lead[]) => Record<string, number>;
  getLeadsBySectorCount: (leads: Lead[]) => Record<string, number>;
  getLeadsByRatingDistribution: (leads: Lead[]) => Record<string, number>;

  // Pagination Selectors
  getPaginatedLeads: (leads: Lead[], page: number, pageSize: number) => Lead[];
  getTotalPages: (leads: Lead[], pageSize: number) => number;

  // Sort Selectors
  getSortedLeads: (
    leads: Lead[],
    sortBy: keyof Lead,
    sortOrder: 'asc' | 'desc',
  ) => Lead[];

  // Statistics Selectors
  getLeadStatistics: (leads: Lead[]) => {
    total: number;
    byStage: Record<string, number>;
    byCompany: Record<string, number>;
    bySource: Record<string, number>;
    bySector: Record<string, number>;
    byRating: Record<string, number>;
    recentLeads: Lead[];
    conversionRate: number;
  };

  // Export Selectors
  /** @deprecated Use backend CSV export instead - this function is no longer needed */
  getExportData: (leads: Lead[]) => any[];
}

export const useLeadSelectors = create<LeadSelectors>((set, get) => ({
  // Basic Selectors
  getSelectedLeads: (leads: Lead[]) => {
    return leads.filter((lead) => lead.id !== undefined);
  },

  getLeadById: (leads: Lead[], id: string) => {
    return leads.find((lead) => lead.id === id);
  },

  // Filter Selectors
  getLeadsByStage: (leads: Lead[], stageId: string) => {
    return leads.filter((lead) => lead.engagementStageId === stageId);
  },

  getLeadsByCompany: (leads: Lead[], companyId: string) => {
    return leads.filter((lead) => lead.companyId === companyId);
  },

  getLeadsBySource: (leads: Lead[], sourceId: string) => {
    return leads.filter((lead) => lead.sourceId === sourceId);
  },

  getLeadsBySector: (leads: Lead[], sectorId: string) => {
    return leads.filter((lead) => lead.sectorId === sectorId);
  },

  getLeadsByRating: (
    leads: Lead[],
    ratingFilter: number | { min?: number; max?: number; exact?: number },
  ) => {
    // Handle different rating filter types
    if (typeof ratingFilter === 'number') {
      // Single number: show leads with exactly that rating
      return leads.filter((lead) => lead.leadRate === ratingFilter);
    }

    // Object with filter options
    if (ratingFilter.exact !== undefined) {
      // Exact rating match
      return leads.filter((lead) => lead.leadRate === ratingFilter.exact);
    }

    if (ratingFilter.min !== undefined && ratingFilter.max !== undefined) {
      // Rating range (min <= rating <= max)
      return leads.filter(
        (lead) =>
          lead.leadRate >= ratingFilter.min! &&
          lead.leadRate <= ratingFilter.max!,
      );
    }

    if (ratingFilter.min !== undefined) {
      // Minimum rating (rating >= min)
      return leads.filter((lead) => lead.leadRate >= ratingFilter.min!);
    }

    if (ratingFilter.max !== undefined) {
      // Maximum rating (rating <= max)
      return leads.filter((lead) => lead.leadRate <= ratingFilter.max!);
    }

    // No valid filter, return all leads
    return leads;
  },

  getLeadsBySearchTerm: (leads: Lead[], searchTerm: string) => {
    if (!searchTerm.trim()) return leads;

    const term = searchTerm.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.name.toLowerCase().includes(term) ||
        lead.contactPersonEmail?.toLowerCase().includes(term) ||
        (lead.contactPersonPhoneNumber &&
          lead.contactPersonPhoneNumber.toLowerCase().includes(term)) ||
        (lead.name && lead.name.toLowerCase().includes(term)) ||
        (lead.sourceId && lead.sourceId.toLowerCase().includes(term)),
    );
  },

  // Computed Selectors
  getLeadsCount: (leads: Lead[]) => {
    return leads.length;
  },

  getLeadsByStageCount: (leads: Lead[]) => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const stage = lead.engagementStageId || 'Unknown';
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  },

  getLeadsByCompanyCount: (leads: Lead[]) => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const company = lead.companyId || 'Unknown';
      counts[company] = (counts[company] || 0) + 1;
    });
    return counts;
  },

  getLeadsBySourceCount: (leads: Lead[]) => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const source = lead.sourceId || 'Unknown';
      counts[source] = (counts[source] || 0) + 1;
    });
    return counts;
  },

  getLeadsBySectorCount: (leads: Lead[]) => {
    const counts: Record<string, number> = {};
    leads.forEach((lead) => {
      const sector = lead.sectorId || 'Unknown';
      counts[sector] = (counts[sector] || 0) + 1;
    });
    return counts;
  },

  getLeadsByRatingDistribution: (leads: Lead[]) => {
    const distribution: Record<string, number> = {
      '1-2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    leads.forEach((lead) => {
      if (lead.leadRate <= 2) {
        distribution['1-2']++;
      } else if (lead.leadRate === 3) {
        distribution['3']++;
      } else if (lead.leadRate === 4) {
        distribution['4']++;
      } else if (lead.leadRate === 5) {
        distribution['5']++;
      }
    });

    return distribution;
  },

  // Pagination Selectors
  getPaginatedLeads: (leads: Lead[], page: number, pageSize: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return leads.slice(startIndex, endIndex);
  },

  getTotalPages: (leads: Lead[], pageSize: number) => {
    return Math.ceil(leads.length / pageSize);
  },

  // Sort Selectors
  getSortedLeads: (
    leads: Lead[],
    sortBy: keyof Lead,
    sortOrder: 'asc' | 'desc',
  ) => {
    return [...leads].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return sortOrder === 'asc' ? -1 : 1;
      if (bValue === undefined) return sortOrder === 'asc' ? 1 : -1;

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });
  },

  // Statistics Selectors
  getLeadStatistics: (leads: Lead[]) => {
    const byStage = get().getLeadsByStageCount(leads);
    const byCompany = get().getLeadsByCompanyCount(leads);
    const bySource = get().getLeadsBySourceCount(leads);
    const bySector = get().getLeadsBySectorCount(leads);
    const byRating = get().getLeadsByRatingDistribution(leads);

    // Get recent leads (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLeads = leads.filter(
      (lead) => lead.createdAt && new Date(lead.createdAt) >= thirtyDaysAgo,
    );

    // Calculate conversion rate (closed leads / total leads)
    const totalLeads = leads.length;
    const closedLeads = leads.filter(
      (lead) =>
        lead.engagementStageId === 'Lost' ||
        lead.engagementStageId === 'Qualified',
    ).length;

    const conversionRate =
      totalLeads > 0 ? (closedLeads / totalLeads) * 100 : 0;

    return {
      total: totalLeads,
      byStage,
      byCompany,
      bySource,
      bySector,
      byRating,
      recentLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  },

  // Export Selectors
  /** @deprecated Use backend CSV export instead - this function is no longer needed */
  getExportData: (leads: Lead[]) => {
    return leads.map((lead) => ({
      ID: lead.id,
      Name: lead.name,
      Email: lead.contactPersonEmail,
      Phone: lead.contactPersonPhoneNumber || 'N/A',
      Company: lead.companyId || 'N/A',
      Source: lead.sourceId || 'N/A',
      Sector: lead.sectorId || 'N/A',
      Stage: lead.engagementStageId || 'N/A',
      Rating: lead.leadRate || 'N/A',
      'Created Date': new Date(lead.createdAt ?? '').toLocaleDateString(),
      'Last Updated': new Date(lead.updatedAt ?? '').toLocaleDateString(),
    }));
  },
}));
