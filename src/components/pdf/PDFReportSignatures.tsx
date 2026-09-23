import React from 'react';

interface PDFReportSignaturesProps {
  showSubjectTeacher?: boolean;
  homeroomTeacherName?: string;
  subjectTeacherName?: string;
  principalName?: string;
  academicHeadName?: string;
}

export const PDFReportSignatures: React.FC<PDFReportSignaturesProps> = ({
  showSubjectTeacher = false,
  homeroomTeacherName,
  subjectTeacherName,
  principalName,
  academicHeadName
}) => {
  const currentDate = new Date().toLocaleDateString('lo-LA', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="pt-6 font-lao text-xs text-slate-800 break-inside-avoid">
      <div className="text-right text-2xs text-slate-600 mb-2 font-medium">
        ວັນທີ ......... ເດືອນ ......... ປີ 20......
      </div>

      <div className={`grid ${showSubjectTeacher ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-center`}>
        {showSubjectTeacher && (
          <div>
            <p className="font-bold text-slate-900">ຄູສອນປະຈຳວິຊາ</p>
            <p className="text-3xs text-slate-500">ເຊັນ ແລະ ລົງຊື່</p>
            <div className="mt-12 border-b border-dotted border-slate-600 mx-3"></div>
            <p className="text-2xs text-slate-700 mt-1 font-semibold">
              {subjectTeacherName || '...........................................'}
            </p>
          </div>
        )}

        <div>
          <p className="font-bold text-slate-900">ຄູປະຈຳຫ້ອງ</p>
          <p className="text-3xs text-slate-500">ເຊັນ ແລະ ລົງຊື່</p>
          <div className="mt-12 border-b border-dotted border-slate-600 mx-3"></div>
          <p className="text-2xs text-slate-700 mt-1 font-semibold">
            {homeroomTeacherName || '...........................................'}
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-900">ຫົວໜ້າວິຊາການ</p>
          <p className="text-3xs text-slate-500">ເຊັນ ແລະ ລົງຊື່</p>
          <div className="mt-12 border-b border-dotted border-slate-600 mx-3"></div>
          <p className="text-2xs text-slate-700 mt-1 font-semibold">
            {academicHeadName || '...........................................'}
          </p>
        </div>

        <div>
          <p className="font-bold text-slate-900">ຜູ້ອຳນວຍການໂຮງຮຽນ</p>
          <p className="text-3xs text-slate-500">ເຊັນ ແລະ ປະທັບຕາ</p>
          <div className="mt-12 border-b border-dotted border-slate-600 mx-3"></div>
          <p className="text-2xs text-slate-700 mt-1 font-semibold">
            {principalName || '...........................................'}
          </p>
        </div>
      </div>
    </div>
  );
};
