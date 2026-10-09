import { redirect } from 'next/navigation';
import { settingsIntegrationsPath } from '@/lib/routes/settings';

export default function Page({ params }: { params: { provider: string } }) {
  redirect(settingsIntegrationsPath(params.provider));
}
