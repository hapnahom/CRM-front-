export type ReportLogoImage = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
};

/**
 * Fetch the tenant logo and normalize it to PNG so PDF/Excel exporters can
 * embed it reliably regardless of the original format (jpeg, webp, etc.).
 */
export async function loadTenantLogoPng(
  logoUrl: string | null | undefined,
): Promise<ReportLogoImage | null> {
  const url = logoUrl?.trim();
  if (!url || typeof document === 'undefined') return null;

  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.size) return null;

    const bitmap = await createImageBitmap(blob);
    const maxEdge = 256;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return null;
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const pngBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((next) => resolve(next), 'image/png');
    });
    if (!pngBlob) return null;

    return {
      buffer: await pngBlob.arrayBuffer(),
      width,
      height,
    };
  } catch {
    // CORS or network failures should not block the export.
    return null;
  }
}
