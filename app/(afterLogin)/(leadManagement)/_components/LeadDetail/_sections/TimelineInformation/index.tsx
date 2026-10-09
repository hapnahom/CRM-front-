'use client';

import { Skeleton } from '@/components/ui/skeleton';
import type { Lead } from '@/store/server/features/leads/interface';
import { formatDateTime } from '@/store/server/features/leads/interface';
import { useGetActivities } from '@/store/server/features/leads/activity/queries';

interface TimelineInformationProps {
  lead: Lead;
  onLeadUpdated?: () => void;
}

export default function TimelineInformation({
  lead,
}: TimelineInformationProps) {
  // Fetch activities count for the current lead
  const {
    data: activitiesData,
    isLoading,
    error,
  } = useGetActivities({
    leadId: lead.id,
    page: 1,
    size: 1000, // Get a large number to ensure we get all activities for accurate count
  });

  // Use the total from API response, or fallback to data length
  // Handle different possible API response structures
  const totalActivities =
    activitiesData?.total ||
    activitiesData?.data?.length ||
    (Array.isArray(activitiesData) ? activitiesData.length : 0);

  return (
    <div className="pt-6">
      <div className="mb-4 flex items-center justify-between ml-2 mr-2">
        <h3 className="m-0 text-base font-semibold text-foreground">
          Timeline Information
        </h3>
      </div>

      {/* Static Information with Real-Time Data */}
      <div className="space-y-4 ml-2 mr-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-muted-foreground">
              Created
            </span>
            <div className="mt-1">
              <span className="text-base font-semibold text-foreground">
                {lead?.createdAt ? formatDateTime(lead.createdAt) : 'N/A'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-muted-foreground">
              Last Update
            </span>
            <div className="mt-1">
              <span className="text-base font-semibold text-foreground">
                {lead?.updatedAt ? formatDateTime(lead.updatedAt) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Activities Count */}
        <div>
          <span className="text-sm font-medium text-muted-foreground">
            Total Activities
          </span>
          <div className="mt-1">
            {isLoading ? (
              <Skeleton className="h-4 w-[100px]" />
            ) : error ? (
              <span className="text-base font-semibold text-muted-foreground">
                Unable to load count
              </span>
            ) : (
              <span className="text-base font-semibold text-foreground">
                {totalActivities}{' '}
                {totalActivities === 1 ? 'activity' : 'activities'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
