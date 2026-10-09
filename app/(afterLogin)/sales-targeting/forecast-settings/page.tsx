import { redirect } from 'next/navigation';

/** Legacy bookmark — forecast rules live on the Forecast page. */
export default function Page() {
  redirect('/sales-targeting/forecast?forecastView=rules');
}
