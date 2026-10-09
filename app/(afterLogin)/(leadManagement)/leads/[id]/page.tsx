'use client';

import { useParams } from 'next/navigation';
import { LeadDetailPage } from '@/modules/leads/lead-detail/LeadDetailPage';
import { DetailPageSkeleton } from '@/components/loading/skeleton-screens';

export default function Page() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];

  if (!id) {
    return <DetailPageSkeleton />;
  }

  return <LeadDetailPage id={id} />;
}
