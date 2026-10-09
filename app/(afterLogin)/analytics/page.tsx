'use client';
import React from 'react';

const AnalyticsPage: React.FC = () => {
  const metabaseBaseUrl =
    process.env.NEXT_PUBLIC_METABASE_URL ?? 'http://metabase.ienetworks.co';
  const dashboardPath =
    '/public/dashboard/653a3ecf-d0fb-48a8-9b60-48cfe3d19dc4';
  const src = `${metabaseBaseUrl}${dashboardPath}`;
  return (
    <iframe
      title="Metabase Analytics"
      src={src}
      className="w-full"
      style={{
        height: 'calc(100vh - 110px)',
        border: '0',
        borderRadius: '8px',
      }}
      allowFullScreen
    />
  );
};

export default AnalyticsPage;
