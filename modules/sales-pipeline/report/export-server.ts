import { saveAs } from 'file-saver';
import { CRM_URL } from '@/utils/constants';
import { crudRequest } from '@/utils/crudRequest';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import type { PipelineReportExportPayload } from './build-export-payload';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getCurrentToken();
  const { userId, tenantId } = useAuthenticationStore.getState();
  return {
    Authorization: `Bearer ${token}`,
    requestedBy: userId != null && userId !== '' ? String(userId) : '',
    createdBy: userId != null && userId !== '' ? String(userId) : '',
    ...tenantHeadersFromStoreTenantId(tenantId),
  };
}

export async function exportPipelineReportOnServer(
  payload: PipelineReportExportPayload,
): Promise<{ filename: string }> {
  const headers = await authHeaders();
  const blob = (await crudRequest({
    url: `${CRM_URL}/reports/pipeline-export/file`,
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    data: payload,
    responseType: 'blob',
  })) as Blob;

  const filename =
    payload.meta.filenameBase + (payload.format === 'pdf' ? '.pdf' : '.xlsx');
  saveAs(blob, filename);
  return { filename };
}
