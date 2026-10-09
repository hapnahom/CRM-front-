import type { Metadata } from 'next';
import { PrivacyPolicyPage } from '@/modules/legal/PrivacyPolicyPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Selamnew Business',
  description:
    'Privacy Policy for Selamnew Business, including how we handle Google Gmail and Calendar integration data.',
};

export default function PrivacyPage() {
  return <PrivacyPolicyPage />;
}
