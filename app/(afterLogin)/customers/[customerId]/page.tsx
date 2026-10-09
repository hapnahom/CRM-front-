'use client';

import { useParams } from 'next/navigation';
import { CustomersDetailPage } from '@/modules/customers/CustomersDetailPage';
import { DetailPageSkeleton } from '@/components/loading/skeleton-screens';

export default function Page() {
  const params = useParams();
  const customerId =
    typeof params.customerId === 'string'
      ? params.customerId
      : params.customerId?.[0];

  if (!customerId) {
    return <DetailPageSkeleton />;
  }

  return <CustomersDetailPage customerId={customerId} />;
}
