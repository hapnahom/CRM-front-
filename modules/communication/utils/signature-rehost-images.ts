import { CRM_URL, FILE_URL } from '@/utils/constants';
import { getCurrentToken } from '@/utils/getCurrentToken';
import { useAuthenticationStore } from '@/store/uistate/features/authentication';
import { tenantHeadersFromStoreTenantId } from '@/utils/serviceRequestTenantHeaders';
import apiClient from '@/utils/apiClient';
import { rewriteSignatureResourceUrl } from '@/modules/communication/utils/signature-import-html.util';

function isAlreadyOnFileServer(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/\/(view|download)\//i.test(trimmed)) return true;
  const base = (FILE_URL || '').replace(/\/$/, '');
  if (base && trimmed.toLowerCase().startsWith(base.toLowerCase())) return true;
  return false;
}

function publicUrlFromRehost(data: unknown): string | null {
  const body = (data ?? {}) as Record<string, unknown>;
  const nested =
    body.data && typeof body.data === 'object'
      ? (body.data as Record<string, unknown>)
      : {};
  const candidates = [
    nested.viewImage,
    body.viewImage,
    nested.image,
    body.image,
  ];
  const raw = candidates.find(
    (v): v is string => typeof v === 'string' && Boolean(v.trim()),
  );
  if (!raw) return null;
  let url = raw.trim();
  if (/^http:\/\//i.test(url)) url = url.replace(/^http:/i, 'https:');
  if (!/^https:\/\//i.test(url)) return null;
  return rewriteSignatureResourceUrl(url);
}

async function rehostRemoteImageUrl(url: string): Promise<string | null> {
  const token = await getCurrentToken();
  const { tenantId } = useAuthenticationStore.getState();
  const response = await apiClient.post(
    `${CRM_URL}/files/rehost-url`,
    { url },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...tenantHeadersFromStoreTenantId(tenantId),
      },
      timeout: 60_000,
    },
  );
  return publicUrlFromRehost(response.data);
}

/**
 * Download third-party signature images via CRM backend and replace src with
 * durable file-server /view/ URLs. Skips URLs already on the file server.
 */
export async function rehostExternalSignatureImages(html: string): Promise<{
  html: string;
  hosted: number;
  failed: string[];
}> {
  if (!html || typeof document === 'undefined') {
    return { html: html || '', hosted: 0, failed: [] };
  }

  const host = document.createElement('div');
  host.innerHTML = html;
  const imgs = Array.from(host.querySelectorAll('img'));
  const cache = new Map<string, string>();
  const failed: string[] = [];
  let hosted = 0;

  for (const img of imgs) {
    const rawSrc = (img.getAttribute('src') || '').trim();
    if (!rawSrc || /^data:/i.test(rawSrc)) continue;

    const rewritten = rewriteSignatureResourceUrl(rawSrc);
    if (isAlreadyOnFileServer(rewritten)) {
      if (rewritten !== rawSrc) img.setAttribute('src', rewritten);
      continue;
    }
    if (!/^https?:\/\//i.test(rewritten)) continue;

    if (cache.has(rewritten)) {
      img.setAttribute('src', cache.get(rewritten)!);
      hosted += 1;
      continue;
    }

    try {
      const next = await rehostRemoteImageUrl(rewritten);
      if (!next) {
        failed.push(rewritten);
        img.setAttribute('src', rewritten);
        continue;
      }
      cache.set(rewritten, next);
      img.setAttribute('src', next);
      hosted += 1;
    } catch {
      failed.push(rewritten);
      // Keep rewritten (working favicon) URL even if rehost fails.
      img.setAttribute('src', rewritten);
    }
  }

  return { html: host.innerHTML, hosted, failed };
}
