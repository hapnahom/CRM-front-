import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'sonner';
import {
  confirmImport,
  downloadImportTemplate,
  resolveImportRow,
  skipImportRow,
  uploadImportFile,
} from './api';
import { importKeys } from './queries';
import { productCatalogKeys } from '@/store/server/features/product-catalog/queries';
import type {
  ImportPreview,
  ImportSummary,
  ImportTemplateKind,
  ResolveImportRowInput,
} from './types';

function cachePreview(
  queryClient: ReturnType<typeof useQueryClient>,
  preview: ImportPreview,
) {
  queryClient.setQueryData(importKeys.job(preview.id), preview);
}

export function useDownloadImportTemplate(
  kind: ImportTemplateKind = 'customer',
) {
  return useMutation(() => downloadImportTemplate(kind), {
    onError: () => {
      toast.error('Could not download the import template.');
    },
  });
}

export function useUploadImportFile(kind: ImportTemplateKind = 'customer') {
  const queryClient = useQueryClient();
  return useMutation((file: File) => uploadImportFile(file, kind), {
    onSuccess: (preview) => {
      cachePreview(queryClient, preview);
    },
  });
}

export function useResolveImportRow(jobId: string | null) {
  const queryClient = useQueryClient();
  return useMutation(
    ({ rowId, payload }: { rowId: string; payload: ResolveImportRowInput }) => {
      if (!jobId) return Promise.reject(new Error('Missing import job'));
      return resolveImportRow(jobId, rowId, payload);
    },
    {
      onSuccess: (preview) => cachePreview(queryClient, preview),
    },
  );
}

export function useSkipImportRow(jobId: string | null) {
  const queryClient = useQueryClient();
  return useMutation(
    (rowId: string) => {
      if (!jobId) return Promise.reject(new Error('Missing import job'));
      return skipImportRow(jobId, rowId);
    },
    {
      onSuccess: (preview) => cachePreview(queryClient, preview),
    },
  );
}

export function useConfirmImport() {
  const queryClient = useQueryClient();
  return useMutation((jobId: string) => confirmImport(jobId), {
    onSuccess: (summary: ImportSummary, jobId) => {
      queryClient.setQueryData(
        importKeys.job(jobId),
        (current: ImportPreview | undefined) =>
          current
            ? { ...current, status: 'confirmed' as const, summary }
            : current,
      );
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['customer-detail'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-deal-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-leads'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] });
      queryClient.invalidateQueries({
        queryKey: ['pipeline-module-dashboard'],
      });
      queryClient.invalidateQueries({ queryKey: ['pipeline-dashboard'] });
      queryClient.invalidateQueries({ queryKey: productCatalogKeys.products });
      queryClient.invalidateQueries({ queryKey: productCatalogKeys.vendors });
      queryClient.invalidateQueries({ queryKey: productCatalogKeys.partners });
      queryClient.invalidateQueries({ queryKey: ['product-performance'] });
    },
  });
}
