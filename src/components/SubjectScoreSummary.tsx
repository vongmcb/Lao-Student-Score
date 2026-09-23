import React from 'react';
import { Subject, ScorePeriod, Student } from '../types';
import {
  StudentCalculatedSummary,
  formatScore,
} from '../services/calculations/scoreEngine';
import { CheckCircle2, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

interface SubjectScoreSummaryProps {
  student: Student;
  summary: StudentCalculatedSummary;
  subjects: Subject[];
  periods: ScorePeriod[];
  className?: string;
  showStatusBadge?: boolean;
}

export const SubjectScoreSummary: React.FC<SubjectScoreSummaryProps> = ({
  student,
  summary,
  subjects,
  periods,
  className = '',
  showStatusBadge = true,
}) => {
  const activeSubjects = subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order);

  // Group periods
  const sem1Monthly = periods.filter(p => p.semester === 1 && !p.isExam).sort((a, b) => a.order - b.order);
  const sem1Exam = periods.find(p => p.semester === 1 && p.isExam);

  const sem2Monthly = periods.filter(p => p.semester === 2 && !p.isExam).sort((a, b) => a.order - b.order);
  const sem2Exam = periods.find(p => p.semester === 2 && p.isExam);

  // Helper for status badges
  const renderStatusBadge = (status: string, label: string) => {
    if (status === 'complete') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {label}
        </span>
      );
    }
    if (status === 'awaiting_exam') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3 text-amber-600" />
          {label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3 text-rose-600" />
        {label}
      </span>
    );
  };

  return (
    <div className={`overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-xs font-lao ${className}`}>
      {/* Header bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            ຕາຕະລາງສະຫຼຸບຄະແນນລາຍວິຊາ ({student.title} {student.firstName} {student.lastName})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ລະຫັດ: {student.studentId} | ເລກທີ: {student.rollNumber} | ຈຳນວນວິຊາທັງໝົດ: {activeSubjects.length} ວິຊາ
          </p>
        </div>

        {showStatusBadge && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600">ສະຖານະປະຈຳປີ:</span>
            {renderStatusBadge(summary.statusAnnual, summary.statusAnnualLabel)}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-700 border-collapse">
          <thead>
            {/* Top Multi-Header */}
            <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-center font-bold">
              <th rowSpan={2} className="px-3 py-2.5 text-left border-r border-slate-200 min-w-[130px] sticky left-0 bg-slate-100 z-10">
                ວິຊາຮຽນ
              </th>
              {/* Semester 1 header */}
              <th colSpan={sem1Monthly.length + 3} className="px-3 py-1.5 bg-blue-50/70 text-blue-900 border-r border-slate-200">
                ພາກຮຽນທີ I
              </th>
              {/* Semester 2 header */}
              <th colSpan={sem2Monthly.length + 3} className="px-3 py-1.5 bg-indigo-50/70 text-indigo-900 border-r border-slate-200">
                ພາກຮຽນທີ II
              </th>
              {/* Annual Header */}
              <th rowSpan={2} className="px-3 py-2.5 bg-emerald-50 text-emerald-950 font-bold border-r border-slate-200 min-w-[85px]">
                ສະເລ່ຍໝົດປີ
              </th>
              <th rowSpan={2} className="px-3 py-2.5 bg-slate-100 min-w-[95px]">
                ສະຖານະ
              </th>
            </tr>

            {/* Sub-Header Columns */}
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-center text-2xs font-semibold">
              {/* Sem 1 columns */}
              {sem1Monthly.map(p => (
                <th key={p.code} className="px-2 py-1.5 border-r border-slate-200 min-w-[42px]">
                  {p.code}
                </th>
              ))}
              <th className="px-2 py-1.5 bg-blue-100/60 text-blue-900 font-bold border-r border-slate-200 min-w-[65px]">
                ສະເລ່ຍເດືອນ
              </th>
              <th className="px-2 py-1.5 bg-blue-100/40 text-blue-900 font-bold border-r border-slate-200 min-w-[50px]">
                ເສັງ I
              </th>
              <th className="px-2 py-1.5 bg-blue-600 text-white font-bold border-r border-slate-200 min-w-[65px]">
                ພາກ I
              </th>

              {/* Sem 2 columns */}
              {sem2Monthly.map(p => (
                <th key={p.code} className="px-2 py-1.5 border-r border-slate-200 min-w-[42px]">
                  {p.code}
                </th>
              ))}
              <th className="px-2 py-1.5 bg-indigo-100/60 text-indigo-900 font-bold border-r border-slate-200 min-w-[65px]">
                ສະເລ່ຍເດືອນ
              </th>
              <th className="px-2 py-1.5 bg-indigo-100/40 text-indigo-900 font-bold border-r border-slate-200 min-w-[50px]">
                ເສັງ II
              </th>
              <th className="px-2 py-1.5 bg-indigo-600 text-white font-bold border-r border-slate-200 min-w-[65px]">
                ພາກ II
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {activeSubjects.map((sub, idx) => {
              const res = summary.subjectResults[sub.id];
              const isEven = idx % 2 === 0;

              return (
                <tr key={sub.id} className={`${isEven ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition`}>
                  {/* Subject Name */}
                  <td className="px-3 py-2 font-medium text-slate-800 border-r border-slate-100 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                    {sub.name}
                  </td>

                  {/* Sem 1 Months */}
                  {sem1Monthly.map(p => {
                    const score = res?.periodScores[p.code];
                    const hasScore = score !== null && score !== undefined;
                    return (
                      <td
                        key={p.code}
                        className={`px-2 py-2 text-center border-r border-slate-100 font-mono ${
                          hasScore ? 'text-slate-800' : 'text-slate-300'
                        }`}
                      >
                        {formatScore(score, 1, '—')}
                      </td>
                    );
                  })}

                  {/* Sem 1 Monthly Avg */}
                  <td className="px-2 py-2 text-center border-r border-slate-100 bg-blue-50/30 font-semibold font-mono">
                    {res?.sem1Monthly.isComplete ? (
                      <span className="text-blue-700">{formatScore(res.sem1Monthly.monthlyAvg, 2)}</span>
                    ) : (
                      <span className="text-2xs text-rose-500 font-sans">ຍັງບໍ່ຄົບ</span>
                    )}
                  </td>

                  {/* Sem 1 Exam */}
                  <td className="px-2 py-2 text-center border-r border-slate-100 bg-blue-50/20 font-semibold font-mono">
                    {res?.exam1 !== null && res?.exam1 !== undefined ? (
                      formatScore(res.exam1, 1)
                    ) : (
                      <span className="text-2xs text-amber-600 font-sans">ລໍຖ້າ</span>
                    )}
                  </td>

                  {/* Sem 1 Final */}
                  <td className="px-2 py-2 text-center border-r border-slate-100 bg-blue-50/60 font-bold font-mono">
                    {res?.semester1.isComplete ? (
                      <span className="text-blue-900">{formatScore(res.semester1.semesterScore, 2)}</span>
                    ) : (
                      <span className="text-2xs text-slate-400 font-sans font-normal">
                        {res?.semester1.statusLabel || '—'}
                      </span>
                    )}
                  </td>

                  {/* Sem 2 Months */}
                  {sem2Monthly.map(p => {
                    const score = res?.periodScores[p.code];
                    const hasScore = score !== null && score !== undefined;
                    return (
                      <td
                        key={p.code}
                        className={`px-2 py-2 text-center border-r border-slate-100 font-mono ${
                          hasScore ? 'text-slate-800' : 'text-slate-300'
                        }`}
                      >
                        {formatScore(score, 1, '—')}
                      </td>
                    );
                  })}

                  {/* Sem 2 Monthly Avg */}
                  <td className="px-2 py-2 text-center border-r border-slate-100 bg-indigo-50/30 font-semibold font-mono">
                    {res?.sem2Monthly.isComplete ? (
                      <span className="text-indigo-700">{formatScore(res.sem2Monthly.monthlyAvg, 2)}</span>
                    ) : (
                      <span className="text-2xs text-rose-500 font-sans">ຍັງບໍ່ຄົບ</span>
                    )}
                  </td>

                  {/* Sem 2 Exam */}
                  <td className="px-2 py-2 text-center border-r border-slate-100 bg-indigo-50/20 font-semibold font-mono">
                    {res?.exam2 !== null && res?.exam2 !== undefined ? (
                      formatScore(res.exam2, 1)
                    ) : (
                      <span className="text-2xs text-amber-600 font-sans">ລໍຖ້າ</span>
                    )}
                  </td>

                  {/* Sem 2 Final */}
                  <td className="px-2 py-2 text-center border-r border-slate-100 bg-indigo-50/60 font-bold font-mono">
                    {res?.semester2.isComplete ? (
                      <span className="text-indigo-900">{formatScore(res.semester2.semesterScore, 2)}</span>
                    ) : (
                      <span className="text-2xs text-slate-400 font-sans font-normal">
                        {res?.semester2.statusLabel || '—'}
                      </span>
                    )}
                  </td>

                  {/* Annual Average */}
                  <td className="px-2 py-2 text-center border-r border-slate-100 bg-emerald-50/40 font-bold font-mono text-emerald-900">
                    {res?.isAnnualComplete ? (
                      formatScore(res.annualScore, 2)
                    ) : (
                      <span className="text-2xs text-slate-400 font-sans font-normal">
                        {res?.annualStatusLabel || 'ຍັງບໍ່ສຳເລັດ'}
                      </span>
                    )}
                  </td>

                  {/* Subject Status Badge */}
                  <td className="px-2 py-2 text-center whitespace-nowrap">
                    {res?.isAnnualComplete ? (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-emerald-50 text-emerald-700">
                        ຄົບ
                      </span>
                    ) : res?.semester1.status === 'awaiting_exam' || res?.semester2.status === 'awaiting_exam' ? (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-amber-50 text-amber-700">
                        ລໍຖ້າເສັງ
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-2xs font-medium bg-rose-50 text-rose-700">
                        ຍັງບໍ່ຄົບ
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer: Totals & Averages */}
          <tfoot>
            {/* Total Row */}
            <tr className="bg-slate-100/90 font-bold text-slate-800 border-t-2 border-slate-300">
              <td className="px-3 py-2.5 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                ຄະແນນລວມ
              </td>
              {/* Sem 1 span */}
              <td colSpan={sem1Monthly.length + 2} className="px-2 py-2 text-center border-r border-slate-200 text-slate-500 font-normal text-2xs">
                (ຄິດໄລ່ສະເພາະວິຊາທີ່ຄົບ: {summary.validSubjectCountSem1} ວິຊາ)
              </td>
              <td className="px-2 py-2 text-center border-r border-slate-200 bg-blue-100 font-mono text-blue-950 font-bold">
                {summary.totalSemester1 !== null ? formatScore(summary.totalSemester1, 2) : '—'}
              </td>

              {/* Sem 2 span */}
              <td colSpan={sem2Monthly.length + 2} className="px-2 py-2 text-center border-r border-slate-200 text-slate-500 font-normal text-2xs">
                (ຄິດໄລ່ສະເພາະວິຊາທີ່ຄົບ: {summary.validSubjectCountSem2} ວິຊາ)
              </td>
              <td className="px-2 py-2 text-center border-r border-slate-200 bg-indigo-100 font-mono text-indigo-950 font-bold">
                {summary.totalSemester2 !== null ? formatScore(summary.totalSemester2, 2) : '—'}
              </td>

              {/* Annual Total */}
              <td className="px-2 py-2 text-center border-r border-slate-200 bg-emerald-100 font-mono text-emerald-950 font-bold">
                {summary.totalAnnual !== null ? formatScore(summary.totalAnnual, 2) : '—'}
              </td>
              <td className="px-2 py-2 bg-slate-100 text-center text-2xs text-slate-500">
                {summary.validSubjectCountAnnual} / {activeSubjects.length} ວິຊາ
              </td>
            </tr>

            {/* Average Row */}
            <tr className="bg-slate-200/80 font-bold text-slate-900 border-t border-slate-300">
              <td className="px-3 py-2.5 sticky left-0 bg-slate-200 z-10 border-r border-slate-300">
                ຄະແນນສະເລ່ຍ
              </td>
              <td colSpan={sem1Monthly.length + 2} className="px-2 py-2 text-right pr-4 border-r border-slate-300 text-xs text-blue-900">
                ສະເລ່ຍ ພາກ I:
              </td>
              <td className="px-2 py-2 text-center border-r border-slate-300 bg-blue-600 text-white font-mono font-bold text-sm">
                {summary.avgSemester1 !== null ? formatScore(summary.avgSemester1, 2) : '—'}
              </td>

              <td colSpan={sem2Monthly.length + 2} className="px-2 py-2 text-right pr-4 border-r border-slate-300 text-xs text-indigo-900">
                ສະເລ່ຍ ພາກ II:
              </td>
              <td className="px-2 py-2 text-center border-r border-slate-300 bg-indigo-600 text-white font-mono font-bold text-sm">
                {summary.avgSemester2 !== null ? formatScore(summary.avgSemester2, 2) : '—'}
              </td>

              {/* Annual Avg */}
              <td className="px-2 py-2 text-center border-r border-slate-300 bg-emerald-600 text-white font-mono font-bold text-sm">
                {summary.avgAnnual !== null ? formatScore(summary.avgAnnual, 2) : '—'}
              </td>

              <td className="px-2 py-2 bg-slate-200 text-center text-xs font-bold text-slate-700">
                {summary.rankAnnual ? `ອັນດັບ ${summary.rankAnnual}` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
