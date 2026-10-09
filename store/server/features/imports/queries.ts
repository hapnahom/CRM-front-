import { useQuery } from 'react-query';
import { fetchImportPreview } from './api';
import type { ImportPreview } from './types';

export const importKeys = {
  all: ['imports'] as const,
  job: (jobId: string) => ['imports', jobId] as const,
};

export function useImportPreview(jobId: string | null) {
  return useQuery<ImportPreview>(
    importKeys.job(jobId ?? ''),
    () => fetchImportPreview(jobId as string),
    {
      enabled: Boolean(jobId),
      staleTime: 5_000,
    },
  );
}
