import React, { useMemo } from 'react';
import { Student, ClassRoom, Subject, ScorePeriod, School, SchoolYear } from '../../types';
import { PDFReportHeader } from './PDFReportHeader';
import { PDFReportSignatures } from './PDFReportSignatures';
import { PDFReportFooter } from './PDFReportFooter';
import { formatScore } from '../../services/calculations/scoreEngine';

interface PDFClassMonthlyReportProps {
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  period: ScorePeriod;
  students: Student[];
  subjects: Subject[];
  /** nested scores: studentId -> subjectId -> periodCode -> number */
  scoresMap: Record<string, Record<string, Record<string, number | null>>>;
  printedBy?: string;
}

export const PDFClassMonthlyReport: React.FC<PDFClassMonthlyReportProps> = ({
  school,
  schoolYear,
  classRoom,
  period,
  students,
  subjects,
  scoresMap,
  printedBy
}) => {
  const activeSubjects = useMemo(() => subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order), [subjects]);

  // Compute total, average, and competition rank for this specific month
  const computedList = useMemo(() => {
    const list = students.map(st => {
      const subScores: Record<string, number | null> = {};
      let sum = 0;
      let count = 0;
      let hasMissing = false;

      for (const sub of activeSubjects) {
        const sc = scoresMap[st.id]?.[sub.id]?.[period.code];
        const val = typeof sc === 'number' && !isNaN(sc) ? sc : null;
        subScores[sub.id] = val;
        if (val !== null) {
          sum += val;
          count++;
        } else {
          hasMissing = true;
        }
      }

      const isComplete = !hasMissing && activeSubjects.length > 0;
      const avg = count > 0 ? sum / count : null;

      return {
        student: st,
        subScores,
        total: count > 0 ? sum : null,
        avg: isComplete ? avg : null,
        isComplete,
        missingCount: activeSubjects.length - count,
        rank: null as number | null
      };
    });

    // Competition Ranking based on avg (or total)
    const validStudents = list
      .filter(s => s.isComplete && s.avg !== null)
      .sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

    let currentRank = 1;
    for (let i = 0; i < validStudents.length; i++) {
      if (i > 0 && Math.abs((validStudents[i].avg ?? 0) - (validStudents[i - 1].avg ?? 0)) < 0.0001) {
        validStudents[i].rank = validStudents[i - 1].rank;
      } else {
        validStudents[i].rank = currentRank;
      }
      currentRank++;
    }

    return list;
  }, [students, activeSubjects, scoresMap, period.code]);

  // Summary statistics for table footer
  const stats = useMemo(() => {
    const avgs = computedList.filter(s => s.avg !== null).map(s => s.avg as number);
    const totals = computedList.filter(s => s.total !== null).map(s => s.total as number);
    return {
      studentCount: students.length,
      completeCount: computedList.filter(s => s.isComplete).length,
      highestAvg: avgs.length > 0 ? Math.max(...avgs) : null,
      lowestAvg: avgs.length > 0 ? Math.min(...avgs) : null,
      classAvg: avgs.length > 0 ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null,
      classTotalAvg: totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null
    };
  }, [computedList, students.length]);

  return (
    <div className="excel-report-sheet p-6 bg-white text-slate-900 font-lao min-h-[210mm] max-w-[297mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2">
      {/* Header */}
      <PDFReportHeader
        title={`ລາຍງານຄະແນນນັກຮຽນທັງໝົດໃນຫ້ອງ — ${period.name}`}
        subtitle={`ຕາຕະລາງສັງລວມຄະແນນປະຈຳເດືອນ (${period.name})`}
        school={school}
        schoolYear={schoolYear}
        classRoom={classRoom}
        periodName={period.name}
      />

      {/* Excel-like Table */}
      <div className="overflow-x-auto my-2">
        <table className="excel-table excel-table-dense text-2xs w-full text-center">
          <thead>
            <tr className="bg-slate-200/90 text-slate-900 font-bold">
              <th className="w-8 py-1.5 px-1">ລ/ດ</th>
              <th className="w-10 py-1.5 px-1">ເລກທີ</th>
              <th className="w-40 py-1.5 px-2 text-left">ຊື່ ແລະ ນາມສະກຸນ</th>
              {activeSubjects.map(sub => (
                <th key={sub.id} className="py-1.5 px-1 whitespace-nowrap min-w-[32px]">
                  {sub.name}
                </th>
              ))}
              <th className="w-14 py-1.5 px-1 bg-blue-100 text-blue-950">ລວມ</th>
              <th className="w-14 py-1.5 px-1 bg-indigo-100 text-indigo-950">ສະເລ່ຍ</th>
              <th className="w-12 py-1.5 px-1 bg-amber-100 text-amber-950">ອັນດັບ</th>
            </tr>
          </thead>
          <tbody>
            {computedList.map((row, idx) => (
              <tr key={row.student.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                <td className="text-slate-500 font-mono">{idx + 1}</td>
                <td className="font-mono font-semibold">#{row.student.rollNumber}</td>
                <td className="text-left font-medium whitespace-nowrap px-2">
                  {row.student.title} {row.student.firstName} {row.student.lastName}
                </td>
                {activeSubjects.map(sub => {
                  const val = row.subScores[sub.id];
                  return (
                    <td key={sub.id} className="font-mono text-center">
                      {formatScore(val, 1, '—')}
                    </td>
                  );
                })}
                <td className="font-mono font-bold bg-blue-50/50 text-blue-950">
                  {row.total !== null ? formatScore(row.total, 2) : '—'}
                </td>
                <td className="font-mono font-extrabold bg-indigo-50/50 text-indigo-950">
                  {row.isComplete ? formatScore(row.avg, 2) : <span className="text-amber-700 text-3xs font-semibold">ຍັງບໍ່ຄົບ</span>}
                </td>
                <td className="font-mono font-black bg-amber-50/50 text-amber-900">
                  {row.rank !== null ? row.rank : '—'}
                </td>
              </tr>
            ))}

            {/* Aggregates Row */}
            <tr className="bg-slate-200 font-bold border-t-2 border-slate-600 text-slate-950">
              <td colSpan={3} className="text-right px-2 py-1 uppercase">
                ຄະແນນສະເລ່ຍລວມທົ່ວຫ້ອງ:
              </td>
              {activeSubjects.map(sub => {
                const subScores = computedList
                  .map(s => s.subScores[sub.id])
                  .filter((v): v is number => typeof v === 'number');
                const subAvg = subScores.length > 0 ? subScores.reduce((a, b) => a + b, 0) / subScores.length : null;
                return (
                  <td key={sub.id} className="font-mono font-bold text-center">
                    {formatScore(subAvg, 2, '—')}
                  </td>
                );
              })}
              <td className="font-mono font-black bg-blue-200 text-blue-950">
                {formatScore(stats.classTotalAvg, 2, '—')}
              </td>
              <td className="font-mono font-black bg-indigo-200 text-indigo-950">
                {formatScore(stats.classAvg, 2, '—')}
              </td>
              <td className="text-center font-mono text-2xs text-slate-600">
                {stats.completeCount}/{stats.studentCount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Quick Summary Strip */}
      <div className="grid grid-cols-4 gap-2 text-2xs p-2 bg-slate-50 border border-slate-300 rounded text-slate-800 my-2 font-medium">
        <div>
          <span>ຈຳນວນນັກຮຽນທັງໝົດ:</span> <strong className="font-mono">{stats.studentCount}</strong> ຄົນ
        </div>
        <div>
          <span>ຄະແນນສະເລ່ຍສູງສຸດ:</span> <strong className="font-mono text-emerald-800">{formatScore(stats.highestAvg, 2, '—')}</strong>
        </div>
        <div>
          <span>ຄະແນນສະເລ່ຍຕ່ຳສຸດ:</span> <strong className="font-mono text-red-800">{formatScore(stats.lowestAvg, 2, '—')}</strong>
        </div>
        <div>
          <span>ຄະແນນຄົບຖ້ວນ:</span> <strong className="font-mono text-blue-800">{stats.completeCount}</strong> ຄົນ ({stats.studentCount - stats.completeCount} ຄົນຍັງບໍ່ຄົບ)
        </div>
      </div>

      {/* Signatures */}
      <PDFReportSignatures
        homeroomTeacherName={classRoom?.homeroomTeacher}
      />

      {/* Footer */}
      <PDFReportFooter printedBy={printedBy} />
    </div>
  );
};
