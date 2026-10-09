import { tokens } from '@/lib/design-tokens';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetActivities } from '@/store/server/features/leads/activity/queries';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Phone } from 'lucide-react';

interface RecentActivitiesProps {
  leadId?: string;
}

export default function RecentActivities({ leadId }: RecentActivitiesProps) {
  const params = useParams();
  const currentLeadId = leadId || (params.id as string);
  const [showAll, setShowAll] = useState(false);

  // Fetch activities for the current lead
  const { data: activitiesData, isLoading } = useGetActivities({
    leadId: currentLeadId,
    page: 1,
    size: 1000, // Get all activities
  });

  // Extract activities from API response
  const allActivities = activitiesData?.data || [];
  const totalActivities = allActivities.length;

  // Show first 10 activities by default, or all if showAll is true
  const displayedActivities = showAll
    ? allActivities
    : allActivities.slice(0, 10);
  const hasMoreActivities = totalActivities > 10;

  const handleViewAll = () => {
    setShowAll(!showAll);
  };
  return (
    <Card
      className="gap-0"
      style={{ border: '2px solid rgba(229, 231, 235, 0.7)' }}
    >
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between ml-2 mr-2">
          <h3 className="m-0 text-base font-semibold text-foreground">
            Recent Activities
          </h3>
          {hasMoreActivities && (
            <Button
              variant="link"
              className="p-0"
              style={{ color: tokens.color.blue }}
              onClick={handleViewAll}
            >
              {showAll ? 'Show Less' : `View All (${totalActivities})`}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="ml-2 mr-2 pb-6 transition-all duration-300 ease-in-out">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2 rounded-lg border p-3">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : displayedActivities.length > 0 ? (
            <div className="space-y-2">
              {displayedActivities.map((activity: any, index: number) => (
                <div
                  key={activity.id || index}
                  className="border border-green-600 rounded-lg bg-surface-card p-3"
                >
                  <div className="flex items-start gap-2 w-full">
                    <div className="w-5 h-5 border-2 border-green-600 bg-surface-card rounded-full flex items-center justify-center">
                      <Phone className="w-2.5 h-2.5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-foreground">
                        {activity.activityName || 'Activity'}
                      </span>
                      <div className="mt-1">
                        <span className="text-sm text-muted-foreground">
                          {activity.description || 'No description available'}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {dayjs(activity.activityDate).format(
                        'DD MMM YYYY, h:mm A',
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <span className="text-muted-foreground">
                No recent activities found
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
