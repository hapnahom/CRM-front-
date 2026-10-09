import { redirect } from 'next/navigation';

export default function Page({ params }: { params: { customerId: string } }) {
  redirect(`/customers/${params.customerId}`);
}
