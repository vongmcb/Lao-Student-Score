import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfGenerationOptions {
  orientation: 'portrait' | 'landscape';
  fileName: string;
  title?: string;
  scale?: number;
}

/**
 * Builds the standardized file name according to user specification (Requirement 21)
 */
export function buildPdfFileName(params: {
  reportType:
    | 'class_monthly'
    | 'class_sem1'
    | 'class_sem2'
    | 'class_annual'
    | 'subject'
    | 'individual'
    | 'tracking_book';
  grade?: string;
  room?: string;
  periodCode?: string;
  subjectCode?: string;
  studentId?: string;
  rollNumber?: number | string;
  schoolYear?: string;
}): string {
  const sanitize = (str?: string | number) =>
    String(str || '')
      .replace(/[\/\s]/g, '-')
      .replace(/[^a-zA-Z0-9\-_.]/g, '');

  const gradeStr = sanitize(params.grade || 'Grade');
  const roomStr = sanitize(params.room || 'Room');
  const yearStr = sanitize(params.schoolYear || '2025-2026');
  const periodStr = sanitize(params.periodCode || '');
  const subjectStr = sanitize(params.subjectCode || 'Subject');
  const studentStr = sanitize(params.studentId || params.rollNumber || '0001');

  switch (params.reportType) {
    case 'class_monthly':
      return `Class_${gradeStr}_${roomStr}_${periodStr || 'Month'}_${yearStr}.pdf`;
    case 'class_sem1':
      return `Class_${gradeStr}_${roomStr}_Semester1_${yearStr}.pdf`;
    case 'class_sem2':
      return `Class_${gradeStr}_${roomStr}_Semester2_${yearStr}.pdf`;
    case 'class_annual':
      return `Class_${gradeStr}_${roomStr}_Annual_${yearStr}.pdf`;
    case 'subject':
      return `Subject_${subjectStr}_${gradeStr}_${roomStr}_${periodStr ? `${periodStr}_` : ''}${yearStr}.pdf`;
    case 'individual':
      return `Student_${studentStr}_${yearStr}.pdf`;
    case 'tracking_book':
      return `TrackingBook_${studentStr}_${yearStr}.pdf`;
    default:
      return `Report_${yearStr}.pdf`;
  }
}

/**
 * Renders an HTML element to PDF and triggers automatic download.
 * Multi-page aware: if element has children with class `.pdf-page`, renders each page.
 * Otherwise, scales and handles vertical slicing across A4 dimensions.
 */
export async function downloadPdfFromElement(
  element: HTMLElement,
  options: PdfGenerationOptions
): Promise<void> {
  const pdfBlob = await generatePdfBlobFromElement(element, options);
  const blobUrl = URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = options.fileName.endsWith('.pdf') ? options.fileName : `${options.fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
}

/**
 * Generates a Blob representing the PDF.
 */
export async function generatePdfBlobFromElement(
  element: HTMLElement,
  options: PdfGenerationOptions
): Promise<Blob> {
  const isLandscape = options.orientation === 'landscape';
  const pdfWidth = isLandscape ? 297 : 210;
  const pdfHeight = isLandscape ? 210 : 297;

  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageElements = element.querySelectorAll<HTMLElement>('.pdf-page');

  if (pageElements.length > 0) {
    // Multi-page document with dedicated .pdf-page blocks
    for (let i = 0; i < pageElements.length; i++) {
      const pageEl = pageElements[i];
      const canvas = await html2canvas(pageEl, {
        scale: options.scale || 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      if (i > 0) {
        pdf.addPage('a4', options.orientation);
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
    }
  } else {
    // Single container or automatic vertical pagination
    const canvas = await html2canvas(element, {
      scale: options.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgWidth = pdfWidth;
    const pageHeightInMm = pdfHeight;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeightInMm;

    while (heightLeft > 2) {
      position = heightLeft - imgHeight;
      pdf.addPage('a4', options.orientation);
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeightInMm;
    }
  }

  return pdf.output('blob');
}
