import React from 'react';
import { School, SchoolYear, ClassRoom } from '../../types';

interface PDFReportHeaderProps {
  title: string;
  subtitle?: string;
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  subjectName?: string;
  periodName?: string;
}

export const PDFReportHeader: React.FC<PDFReportHeaderProps> = ({
  title,
  subtitle,
  school,
  schoolYear,
  classRoom,
  subjectName,
  periodName
}) => {
  return (
    <div className="text-center space-y-1 pb-3 mb-2 font-lao border-b border-slate-700">
      {/* National Emblem & Slogan */}
      <div className="space-y-0.5">
        <p className="text-xs font-bold tracking-wide text-slate-900">
          ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
        </p>
        <p className="text-2xs font-semibold tracking-widest text-slate-800">
          ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
        </p>
        <div className="w-16 h-0.5 bg-slate-800 mx-auto my-1"></div>
      </div>

      {/* School Name & Location */}
      <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-800">
        <div className="text-left font-semibold">
          <p className="font-bold text-sm text-slate-950 uppercase">{school?.name || 'ໂຮງຮຽນ ມັດທະຍົມສົມບູນ'}</p>
          <p className="text-2xs text-slate-600">
            {school?.district ? `ເມືອງ ${school.district}` : ''} {school?.province ? `ແຂວງ ${school.province}` : ''}
          </p>
        </div>

        <div className="text-right text-xs">
          <p className="font-bold text-slate-900">
            ສົກຮຽນ: <span className="font-mono">{schoolYear?.name || '2025-2026'}</span>
          </p>
          <p className="font-semibold text-slate-700">
            {classRoom ? `ຊັ້ນ: ${classRoom.grade} • ຫ້ອງ: ${classRoom.name}` : ''}
          </p>
        </div>
      </div>

      {/* Report Title */}
      <div className="pt-1.5">
        <h1 className="text-base sm:text-lg font-black text-slate-950 uppercase tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-2xs sm:text-xs font-medium text-slate-700">{subtitle}</p>
        )}
        <div className="flex items-center justify-center gap-3 text-2xs text-slate-600 mt-0.5 font-semibold">
          {subjectName && <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">ວິຊາ: {subjectName}</span>}
          {periodName && <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-300">ງວດ: {periodName}</span>}
        </div>
      </div>
    </div>
  );
};
