import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Printer,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { downloadPdfFromElement } from '../../services/pdf/pdfGenerator';
import { saveReportHistory } from '../../services/dataService';
import { ReportHistoryRecord, ReportCategory } from '../../types';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileName: string;
  orientation: 'portrait' | 'landscape';
  reportCategory: ReportCategory;
  meta: {
    schoolYearId: string;
    schoolYearName?: string;
    classId: string;
    className?: string;
    studentId?: string;
    studentName?: string;
    subjectId?: string;
    subjectName?: string;
    periodId?: string;
    periodName?: string;
  };
  currentUserEmail?: string;
  children: React.ReactNode;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  fileName,
  orientation,
  reportCategory,
  meta,
  currentUserEmail = 'teacher@laostudentscore.edu.la',
  children
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 15, 175));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 15, 50));
  const handleResetZoom = () => setZoom(100);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!printContainerRef.current) return;
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      await downloadPdfFromElement(printContainerRef.current, {
        orientation,
        fileName,
        title
      });

      // Log report generation in Firestore (Requirement 23)
      await saveReportHistory({
        reportType: reportCategory,
        reportTitle: title,
        schoolYearId: meta.schoolYearId,
        schoolYearName: meta.schoolYearName,
        classId: meta.classId,
        className: meta.className,
        studentId: meta.studentId,
        studentName: meta.studentName,
        subjectId: meta.subjectId,
        subjectName: meta.subjectName,
        periodId: meta.periodId,
        periodName: meta.periodName,
        fileName,
        generatedBy: currentUserEmail,
        generatedAt: new Date().toISOString()
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF download:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-xs text-slate-100 font-lao animate-in fade-in duration-200">
      {/* Top Floating Controls Bar */}
      <div className="no-print bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight line-clamp-1">{title}</h2>
            <p className="text-3xs text-slate-400 font-mono line-clamp-1">{fileName} ({orientation.toUpperCase()})</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center bg-slate-800 rounded-xl border border-slate-700/80 p-0.5 text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono text-3xs text-slate-400 select-none min-w-[45px] text-center">
              {zoom}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition ml-0.5"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition text-slate-200"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>ພິມ (Print)</span>
          </button>

          {/* Download button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
              downloadSuccess
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>ກຳລັງສ້າງ PDF...</span>
              </>
            ) : downloadSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ດາວໂຫຼດສຳເລັດ!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>ດາວໂຫຼດ PDF</span>
              </>
            )}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Scroll Area */}
      <div className="flex-1 overflow-auto p-4 sm:p-8 flex justify-center items-start bg-slate-900/60 custom-scrollbar">
        <div
          ref={printContainerRef}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out'
          }}
          className="shadow-2xl rounded-sm print:shadow-none print:transform-none"
        >
          {children}
        </div>
      </div>
    </div>
  );
};
