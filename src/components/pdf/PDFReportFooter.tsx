import React from 'react';

interface PDFReportFooterProps {
  printedBy?: string;
  currentPage?: number;
  totalPages?: number;
}

export const PDFReportFooter: React.FC<PDFReportFooterProps> = ({
  printedBy = 'ຄູສອນ / Admin',
  currentPage = 1,
  totalPages = 1
}) => {
  const printDate = new Date().toLocaleString('lo-LA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div className="pt-4 mt-auto border-t border-slate-300 text-3xs text-slate-500 font-lao flex items-center justify-between">
      <div>
        <span>ວັນທີພິມ: {printDate}</span>
      </div>
      <div>
        <span>ຜູ້ພິມ: {printedBy}</span>
      </div>
      <div>
        <span>ໜ້າ {currentPage} / {totalPages}</span>
      </div>
    </div>
  );
};
