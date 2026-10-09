'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Page() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/deals/${params.id as string}`);
  }, [params.id, router]);

  return null;
}
