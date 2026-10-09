import type { Metadata } from 'next';
import { TermsOfServicePage } from '@/modules/legal/TermsOfServicePage';

export const metadata: Metadata = {
  title: 'Terms of Service | Selamnew Business',
  description:
    'Terms of Service for Selamnew Business by IE Network Solutions.',
};

export default function TermsPage() {
  return <TermsOfServicePage />;
}
