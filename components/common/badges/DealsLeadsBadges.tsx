import { Badge } from '@/components/ui/badge';
import { dealUiLabel, isLeadsEnabled } from '@/config/salesWorkflow';

export function DealsLeadsBadges({
  dealsCount,
  leadsCount,
}: {
  dealsCount: number;
  leadsCount: number;
}) {
  const showLeads = isLeadsEnabled();
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="deal">
        {dealsCount} {dealUiLabel({ plural: dealsCount !== 1 })}
      </Badge>
      {showLeads ? (
        <Badge variant="lead">
          {leadsCount} Lead{leadsCount === 1 ? '' : 's'}
        </Badge>
      ) : null}
    </div>
  );
}
