import { CRM_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import { crudRequest } from '@/utils/crudRequest';
import { saveAs } from 'file-saver';
import type {
  ImportPreview,
  ImportSummary,
  ImportTemplateKind,
  ResolveImportRowInput,
} from './types';

export const IMPORTS_URL = `${CRM_URL}/imports`;

export async function importAuthHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

export async function downloadImportTemplate(
  kind: ImportTemplateKind = 'customer',
): Promise<void> {
  const headers = await importAuthHeaders();
  const blob = (await crudRequest({
    url: `${IMPORTS_URL}/templates/${kind}`,
    method: 'GET',
    headers,
    responseType: 'blob',
  })) as Blob;
  saveAs(blob, `crm_${kind}_import_template.xlsx`);
}

export async function uploadImportFile(
  file: File,
  kind: ImportTemplateKind = 'customer',
): Promise<ImportPreview> {
  const headers = await importAuthHeaders();
  const form = new FormData();
  form.append('file', file);
  return crudRequest({
    url: `${IMPORTS_URL}?kind=${encodeURIComponent(kind)}`,
    method: 'POST',
    data: form,
    headers,
  });
}

export async function fetchImportPreview(
  jobId: string,
): Promise<ImportPreview> {
  const headers = await importAuthHeaders();
  return crudRequest({
    url: `${IMPORTS_URL}/${jobId}`,
    method: 'GET',
    headers,
  });
}

export async function resolveImportRow(
  jobId: string,
  rowId: string,
  payload: ResolveImportRowInput,
): Promise<ImportPreview> {
  const headers = await importAuthHeaders();
  return crudRequest({
    url: `${IMPORTS_URL}/${jobId}/rows/${rowId}`,
    method: 'PATCH',
    data: payload,
    headers,
  });
}

export async function skipImportRow(
  jobId: string,
  rowId: string,
): Promise<ImportPreview> {
  const headers = await importAuthHeaders();
  return crudRequest({
    url: `${IMPORTS_URL}/${jobId}/rows/${rowId}/skip`,
    method: 'POST',
    headers,
  });
}

export async function confirmImport(jobId: string): Promise<ImportSummary> {
  const headers = await importAuthHeaders();
  return crudRequest({
    url: `${IMPORTS_URL}/${jobId}/confirm`,
    method: 'POST',
    headers,
  });
}
