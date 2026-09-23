import React, { useMemo } from 'react';
import { Student, ClassRoom, Subject, ScorePeriod, School, SchoolYear } from '../../types';
import { PDFReportHeader } from './PDFReportHeader';
import { PDFReportSignatures } from './PDFReportSignatures';
import { PDFReportFooter } from './PDFReportFooter';
import {
  calculateStudentSubjectScores,
  formatScore
} from '../../services/calculations/scoreEngine';
import { calculateClassStudentRankings } from '../../services/calculations/rankingEngine';

interface PDFClassAnnualReportProps {
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  students: Student[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scoresMap: Record<string, Record<string, Record<string, number | null>>>;
  printedBy?: string;
}

export const PDFClassAnnualReport: React.FC<PDFClassAnnualReportProps> = ({
  school,
  schoolYear,
  classRoom,
  students,
  subjects,
  periods,
  scoresMap,
  printedBy
}) => {
  const activeSubjects = useMemo(() => subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order), [subjects]);

  const studentSummaries = useMemo(() => {
    return students.map(st => {
      const pMap = scoresMap[st.id] || {};
      return calculateStudentSubjectScores(st.id, pMap, activeSubjects, periods, st);
    });
  }, [students, scoresMap, activeSubjects, periods]);

  const rankedSummaries = useMemo(() => {
    return calculateClassStudentRankings(studentSummaries);
  }, [studentSummaries]);

  const stats = useMemo(() => {
    const annualAvgs = rankedSummaries.map(s => s.avgAnnual).filter((v): v is number => v !== null);
    const passed = rankedSummaries.filter(s => s.isAnnualComplete && (s.avgAnnual ?? 0) >= 5.0).length;
    const failed = rankedSummaries.filter(s => s.isAnnualComplete && (s.avgAnnual ?? 0) < 5.0).length;
    const incomplete = rankedSummaries.filter(s => !s.isAnnualComplete).length;

    return {
      classAvg: annualAvgs.length > 0 ? annualAvgs.reduce((a, b) => a + b, 0) / annualAvgs.length : null,
      maxAvg: annualAvgs.length > 0 ? Math.max(...annualAvgs) : null,
      minAvg: annualAvgs.length > 0 ? Math.min(...annualAvgs) : null,
      passed,
      failed,
      incomplete,
      totalStudents: students.length
    };
  }, [rankedSummaries, students.length]);

  return (
    <div className="excel-report-sheet p-6 bg-white text-slate-900 font-lao min-h-[210mm] max-w-[297mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2">
      {/* Official Header */}
      <PDFReportHeader
        title="ລາຍງານສະຫຼຸບຄະແນນສິ້ນສົກຮຽນ (Annual Summary Report)"
        subtitle="ຕາຕະລາງສັງລວມຄະແນນ ແລະ ຜົນການຮຽນປະຈຳປີ ນັກຮຽນທັງໝົດໃນຫ້ອງ"
        school={school}
        schoolYear={schoolYear}
        classRoom={classRoom}
        periodName="ໝົດປີ (Annual)"
      />

      {/* Main Table */}
      <div className="overflow-x-auto my-2">
        <table className="excel-table excel-table-dense text-2xs w-full text-center">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th rowSpan={2} className="w-8 py-1.5 px-1">ລ/ດ</th>
              <th rowSpan={2} className="w-10 py-1.5 px-1">ເລກທີ</th>
              <th rowSpan={2} className="w-40 py-1.5 px-2 text-left">ຊື່ ແລະ ນາມສະກຸນ</th>
              {activeSubjects.map(sub => (
                <th key={sub.id} className="py-1 px-1 min-w-[34px]">
                  {sub.name}
                </th>
              ))}
              <th rowSpan={2} className="w-12 py-1.5 px-1 bg-blue-100 text-blue-950 font-bold">
                ພາກ I
              </th>
              <th rowSpan={2} className="w-12 py-1.5 px-1 bg-indigo-100 text-indigo-950 font-bold">
                ພາກ II
              </th>
              <th rowSpan={2} className="w-14 py-1.5 px-1 bg-emerald-100 text-emerald-950 font-black">
                ສະເລ່ຍປີ
              </th>
              <th rowSpan={2} className="w-10 py-1.5 px-1 bg-amber-100 text-amber-950 font-black">
                ອັນດັບ
              </th>
              <th rowSpan={2} className="w-20 py-1.5 px-1 bg-slate-100 text-slate-800 font-bold">
                ສະຖານະຜົນການຮຽນ
              </th>
            </tr>
            <tr className="bg-slate-100 text-slate-700 text-3xs">
              {activeSubjects.map(sub => (
                <th key={sub.id} className="py-0.5 px-0.5 font-normal">
                  ໝົດປີ
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankedSummaries.map((summary, idx) => {
              const annual = summary.avgAnnual;
              const sem1 = summary.avgSemester1;
              const sem2 = summary.avgSemester2;
              const isPassed = summary.isAnnualComplete && (annual ?? 0) >= 5.0;

              return (
                <tr key={summary.studentId} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="text-slate-500 font-mono">{idx + 1}</td>
                  <td className="font-mono font-semibold">#{summary.student?.rollNumber}</td>
                  <td className="text-left font-medium whitespace-nowrap px-2">
                    {summary.student?.title} {summary.student?.firstName} {summary.student?.lastName}
                  </td>

                  {/* Subject Annual Scores */}
                  {activeSubjects.map(sub => {
                    const res = summary.subjectResults[sub.id];
                    return (
                      <td key={sub.id} className="font-mono text-center">
                        {res?.isAnnualComplete ? formatScore(res.annualScore, 2) : <span className="text-slate-400">—</span>}
                      </td>
                    );
                  })}

                  {/* Sem 1 Avg */}
                  <td className="font-mono font-semibold bg-blue-50/30 text-blue-900">
                    {sem1 !== null ? formatScore(sem1, 2) : '—'}
                  </td>

                  {/* Sem 2 Avg */}
                  <td className="font-mono font-semibold bg-indigo-50/30 text-indigo-900">
                    {sem2 !== null ? formatScore(sem2, 2) : '—'}
                  </td>

                  {/* Annual Avg */}
                  <td className="font-mono font-black bg-emerald-50/70 text-emerald-950">
                    {annual !== null ? formatScore(annual, 2) : <span className="text-amber-700 text-3xs font-semibold">ຍັງບໍ່ຄົບ</span>}
                  </td>

                  {/* Rank */}
                  <td className="font-mono font-black bg-amber-50/50 text-amber-900">
                    {summary.rankAnnual !== null ? summary.rankAnnual : '—'}
                  </td>

                  {/* Result Status */}
                  <td className="text-3xs font-bold whitespace-nowrap px-1">
                    {summary.isAnnualComplete ? (
                      isPassed ? (
                        <span className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">
                          ໄດ້ເລື່ອນຂັ້ນ
                        </span>
                      ) : (
                        <span className="text-red-700 bg-red-50 px-1 py-0.5 rounded border border-red-200">
                          ສອບເສັງຄືນ
                        </span>
                      )
                    ) : (
                      <span className="text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">
                        ຍັງບໍ່ຄົບ
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Class Average Row */}
            <tr className="bg-slate-200 font-bold border-t-2 border-slate-600 text-slate-950">
              <td colSpan={3} className="text-right px-2 py-1 uppercase">
                ຄະແນນສະເລ່ຍລວມທົ່ວຫ້ອງ:
              </td>
              {activeSubjects.map(sub => {
                const subScores = rankedSummaries
                  .map(s => s.subjectResults[sub.id]?.annualScore)
                  .filter((v): v is number => typeof v === 'number');
                const subAvg = subScores.length > 0 ? subScores.reduce((a, b) => a + b, 0) / subScores.length : null;
                return (
                  <td key={sub.id} className="font-mono font-bold text-center">
                    {formatScore(subAvg, 2, '—')}
                  </td>
                );
              })}
              <td className="font-mono font-bold bg-blue-200 text-blue-950">
                {formatScore(
                  rankedSummaries.map(s => s.avgSemester1).filter((v): v is number => v !== null).reduce((a, b, _, arr) => a + b / arr.length, 0),
                  2,
                  '—'
                )}
              </td>
              <td className="font-mono font-bold bg-indigo-200 text-indigo-950">
                {formatScore(
                  rankedSummaries.map(s => s.avgSemester2).filter((v): v is number => v !== null).reduce((a, b, _, arr) => a + b / arr.length, 0),
                  2,
                  '—'
                )}
              </td>
              <td className="font-mono font-black bg-emerald-200 text-emerald-950">
                {formatScore(stats.classAvg, 2, '—')}
              </td>
              <td colSpan={2} className="text-center font-mono text-2xs text-slate-700">
                ເລື່ອນຂັ້ນ {stats.passed}/{stats.totalStudents} ຄົນ
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Statistics Strip */}
      <div className="grid grid-cols-4 gap-2 text-2xs p-2 bg-slate-50 border border-slate-300 rounded text-slate-800 my-2 font-medium">
        <div>
          <span>ຈຳນວນນັກຮຽນທັງໝົດ:</span> <strong className="font-mono">{stats.totalStudents}</strong> ຄົນ
        </div>
        <div>
          <span>ໄດ້ເລື່ອນຂັ້ນ (≥ 5.0):</span> <strong className="font-mono text-emerald-800">{stats.passed}</strong> ຄົນ ({stats.totalStudents > 0 ? ((stats.passed / stats.totalStudents) * 100).toFixed(1) : 0}%)
        </div>
        <div>
          <span>ສອບເສັງຄືນ (&lt; 5.0):</span> <strong className="font-mono text-red-800">{stats.failed}</strong> ຄົນ
        </div>
        <div>
          <span>ຄະແນນຍັງບໍ່ຄົບຖ້ວນ:</span> <strong className="font-mono text-amber-800">{stats.incomplete}</strong> ຄົນ
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
