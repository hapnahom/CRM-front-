import { redirect } from 'next/navigation';
import { settingsPath } from '@/lib/routes/settings';

export default function Page() {
  redirect(settingsPath('integrations'));
}
