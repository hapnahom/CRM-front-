'use client';

import { useParams } from 'next/navigation';
import { DealDetailPage } from '@/modules/deals/deal-detail/DealDetailPage';
import { DetailPageSkeleton } from '@/components/loading/skeleton-screens';

export default function Page() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0];

  if (!id) {
    return <DetailPageSkeleton />;
  }

  return <DealDetailPage id={id} />;
}
