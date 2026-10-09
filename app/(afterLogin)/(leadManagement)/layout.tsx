import { notFound } from 'next/navigation';
import { isLeadsEnabled } from '@/config/salesWorkflow';

export default function LeadManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isLeadsEnabled()) {
    notFound();
  }

  return children;
}
