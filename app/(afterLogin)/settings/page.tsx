import { redirect } from 'next/navigation';

export default function SettingsRedirect({
  searchParams,
}: {
  searchParams?: { section?: string };
}) {
  const section = searchParams?.section;
  redirect(section ? `/setting?section=${section}` : '/setting');
}
