import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Export dashboard to PDF with multiple pages support
 * Based on the existing exportOrgStructureToPdfAndPng pattern
 */

interface ExportDashboardToPdfOptions {
  dashboardRef: React.RefObject<HTMLDivElement>;
  filename?: string;
  // Orientation is now handled by the multi-page logic
  includeMetadata?: {
    title?: string;
    period?: string;
    currency?: string;
    generatedBy?: string;
  };
}

export const exportDashboardToPdf = async (
  options: ExportDashboardToPdfOptions,
): Promise<{ success: boolean; message: string; error?: any }> => {
  const {
    dashboardRef,
    filename = `dashboard_export_${new Date().toISOString().split('T')[0]}`,
    includeMetadata,
  } = options;

  try {
    const input = dashboardRef.current;

    if (!input) {
      throw new Error('Dashboard element not found');
    }

    // --- FIX: Store original positions and scroll to top ---
    const originalScrollX = window.scrollX;
    const originalScrollY = window.scrollY;
    window.scrollTo(0, 0);

    // Store original styles
    const originalOverflow = input.style.overflow;
    input.style.overflow = 'visible';

    // Wait for charts to fully render after scroll
    await new Promise((resolve) => setTimeout(resolve, 500));

    const canvas = await html2canvas(input, {
      scale: 2, // Increase scale for better quality
      useCORS: true,
      width: input.scrollWidth, // Use scrollWidth directly
      height: input.scrollHeight, // Use scrollHeight directly
      // --- FIX: Remove scrollX and scrollY as we now manually scroll to top ---
      ignoreElements: (element) => {
        return (
          element.classList.contains('hide-on-export') ||
          element.classList.contains('no-print') ||
          element.classList.contains('hide-on-download')
        );
      },
    });

    // --- FIX: Restore original scroll position and styles ---
    input.style.overflow = originalOverflow;
    window.scrollTo(originalScrollX, originalScrollY);

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // --- SINGLE PAGE PDF Logic ---
    // Use a standard landscape A4 page size for calculations
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      hotfixes: ['px_scaling'], // Important for accurate pixel scaling
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate scaling to fit everything on ONE page
    // Reserve space for header (60px) and footer (30px)
    const availableHeight = pdfHeight - 90; // 90px for header + footer
    const availableWidth = pdfWidth - 40; // 40px for margins

    // Calculate ratios for both width and height
    const widthRatio = availableWidth / imgWidth;
    const heightRatio = availableHeight / imgHeight;

    // Use the smaller ratio to ensure everything fits on one page
    const ratio = Math.min(widthRatio, heightRatio);

    // Calculate final dimensions
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;

    // Center the image on the page
    const xOffset = (pdfWidth - finalWidth) / 2;
    const yOffset = (pdfHeight - finalHeight) / 2 + 30; // 30px for header space

    // Add metadata if provided
    if (includeMetadata) {
      pdf.setProperties({
        title: includeMetadata.title || 'CRM Dashboard Export',
        subject: `Dashboard Report - ${includeMetadata.period || 'Current Period'}`,
        author: includeMetadata.generatedBy || 'CRM System',
      });
    }

    // Add the dashboard image scaled to fit one page
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);

    // --- SINGLE PAGE: Add header and footer ---
    pdf.setFontSize(10);
    pdf.setTextColor(100);

    // Header
    if (includeMetadata) {
      pdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 20);
      if (includeMetadata.period) {
        pdf.text(`Period: ${includeMetadata.period}`, 20, 35);
      }
      if (includeMetadata.currency) {
        pdf.text(`Currency: ${includeMetadata.currency}`, 20, 50);
      }
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(150);
    pdf.text(`Page 1 of 1`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });

    // Save the PDF
    pdf.save(`${filename}.pdf`);

    return {
      success: true,
      message: 'Dashboard exported successfully',
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || 'Failed to export dashboard',
      error,
    };
  }
};

/**
 * Quick export function with default settings
 */
export const exportDashboardQuick = async (
  dashboardRef: React.RefObject<HTMLDivElement>,
  filename?: string,
): Promise<{ success: boolean; message: string }> => {
  return exportDashboardToPdf({
    dashboardRef,
    filename,
  });
};
