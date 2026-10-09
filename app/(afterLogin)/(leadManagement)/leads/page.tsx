import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/sales-hub?tab=leads');
}
