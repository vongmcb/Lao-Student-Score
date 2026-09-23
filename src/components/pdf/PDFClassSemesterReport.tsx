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

interface PDFClassSemesterReportProps {
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  semester: 1 | 2;
  students: Student[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scoresMap: Record<string, Record<string, Record<string, number | null>>>;
  printedBy?: string;
}

export const PDFClassSemesterReport: React.FC<PDFClassSemesterReportProps> = ({
  school,
  schoolYear,
  classRoom,
  semester,
  students,
  subjects,
  periods,
  scoresMap,
  printedBy
}) => {
  const activeSubjects = useMemo(() => subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order), [subjects]);

  // Compute student summaries using official BUILD 2 engines
  const studentSummaries = useMemo(() => {
    return students.map(st => {
      const pMap = scoresMap[st.id] || {};
      return calculateStudentSubjectScores(st.id, pMap, activeSubjects, periods, st);
    });
  }, [students, scoresMap, activeSubjects, periods]);

  const rankedSummaries = useMemo(() => {
    return calculateClassStudentRankings(studentSummaries);
  }, [studentSummaries]);

  const isSem1 = semester === 1;
  const monthCodes = isSem1 ? ['09', '10', '11', '12'] : ['02', '03', '04', '05'];
  const examCode = isSem1 ? 'exam1' : 'exam2';
  const semesterTitle = isSem1 ? 'ພາກຮຽນທີ I' : 'ພາກຮຽນທີ II';

  // Overall class averages for this semester
  const averages = useMemo(() => {
    const list = rankedSummaries.map(s => (isSem1 ? s.avgSemester1 : s.avgSemester2)).filter((v): v is number => v !== null);
    const totals = rankedSummaries.map(s => (isSem1 ? s.totalSemester1 : s.totalSemester2)).filter((v): v is number => v !== null);
    return {
      avg: list.length > 0 ? list.reduce((a, b) => a + b, 0) / list.length : null,
      total: totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : null,
      max: list.length > 0 ? Math.max(...list) : null,
      min: list.length > 0 ? Math.min(...list) : null,
      completeCount: rankedSummaries.filter(s => (isSem1 ? s.statusSem1 === 'complete' : s.statusSem2 === 'complete')).length
    };
  }, [rankedSummaries, isSem1]);

  return (
    <div className="excel-report-sheet p-6 bg-white text-slate-900 font-lao min-h-[210mm] max-w-[297mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2">
      {/* Official Header */}
      <PDFReportHeader
        title={`ລາຍງານສະຫຼຸບຄະແນນ ${semesterTitle}`}
        subtitle={`ຕາຕະລາງສັງລວມຜົນການຮຽນນັກຮຽນທັງໝົດໃນຫ້ອງ ປະຈຳ ${semesterTitle}`}
        school={school}
        schoolYear={schoolYear}
        classRoom={classRoom}
        periodName={semesterTitle}
      />

      {/* Main Table */}
      <div className="overflow-x-auto my-2">
        <table className="excel-table excel-table-dense text-2xs w-full text-center">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th rowSpan={2} className="w-8 py-1 px-1">ລ/ດ</th>
              <th rowSpan={2} className="w-10 py-1 px-1">ເລກທີ</th>
              <th rowSpan={2} className="w-40 py-1 px-2 text-left">ຊື່ ແລະ ນາມສະກຸນ</th>
              {activeSubjects.map(sub => (
                <th key={sub.id} className="py-1 px-1 min-w-[36px]">
                  {sub.name}
                </th>
              ))}
              <th rowSpan={2} className="w-14 py-1 px-1 bg-blue-100 text-blue-950 font-bold">
                ຄະແນນລວມ
              </th>
              <th rowSpan={2} className="w-14 py-1 px-1 bg-indigo-100 text-indigo-950 font-extrabold">
                ຄະແນນສະເລ່ຍ
              </th>
              <th rowSpan={2} className="w-12 py-1 px-1 bg-amber-100 text-amber-950 font-black">
                ອັນດັບ
              </th>
              <th rowSpan={2} className="w-16 py-1 px-1 bg-slate-100 text-slate-800">
                ສະຖານະ
              </th>
            </tr>
            <tr className="bg-slate-100 text-slate-700 text-3xs">
              {activeSubjects.map(sub => (
                <th key={sub.id} className="py-0.5 px-0.5 font-normal">
                  {isSem1 ? 'ພາກ I' : 'ພາກ II'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rankedSummaries.map((summary, idx) => {
              const semScore = isSem1 ? summary.avgSemester1 : summary.avgSemester2;
              const semTotal = isSem1 ? summary.totalSemester1 : summary.totalSemester2;
              const rank = isSem1 ? summary.rankSem1 : summary.rankSem2;
              const status = isSem1 ? summary.statusSem1 : summary.statusSem2;

              return (
                <tr key={summary.studentId} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="text-slate-500 font-mono">{idx + 1}</td>
                  <td className="font-mono font-semibold">#{summary.student?.rollNumber}</td>
                  <td className="text-left font-medium whitespace-nowrap px-2">
                    {summary.student?.title} {summary.student?.firstName} {summary.student?.lastName}
                  </td>

                  {/* Each Subject's Semester Score */}
                  {activeSubjects.map(sub => {
                    const subRes = summary.subjectResults[sub.id];
                    const val = isSem1 ? subRes?.semester1.semesterScore : subRes?.semester2.semesterScore;
                    const isComplete = isSem1 ? subRes?.semester1.isComplete : subRes?.semester2.isComplete;

                    return (
                      <td key={sub.id} className="font-mono text-center">
                        {isComplete ? formatScore(val, 2) : <span className="text-slate-400">—</span>}
                      </td>
                    );
                  })}

                  {/* Total */}
                  <td className="font-mono font-bold bg-blue-50/50 text-blue-950">
                    {semTotal !== null ? formatScore(semTotal, 2) : '—'}
                  </td>

                  {/* Average */}
                  <td className="font-mono font-extrabold bg-indigo-50/50 text-indigo-950">
                    {semScore !== null ? formatScore(semScore, 2) : <span className="text-amber-700 text-3xs font-semibold">ຍັງບໍ່ຄົບ</span>}
                  </td>

                  {/* Rank */}
                  <td className="font-mono font-black bg-amber-50/50 text-amber-900">
                    {rank !== null ? rank : '—'}
                  </td>

                  {/* Status */}
                  <td className="text-3xs font-semibold">
                    {status === 'complete' && <span className="text-emerald-700">ຄົບຖ້ວນ</span>}
                    {status === 'awaiting_exam' && <span className="text-blue-700">ລໍຖ້າເສັງ</span>}
                    {status === 'missing_scores' && <span className="text-amber-700">ຍັງບໍ່ຄົບ</span>}
                  </td>
                </tr>
              );
            })}

            {/* Aggregates Row */}
            <tr className="bg-slate-200 font-bold border-t-2 border-slate-600 text-slate-950">
              <td colSpan={3} className="text-right px-2 py-1 uppercase">
                ຄະແນນສະເລ່ຍລວມທົ່ວຫ້ອງ:
              </td>
              {activeSubjects.map(sub => {
                const subScores = rankedSummaries
                  .map(s => {
                    const res = s.subjectResults[sub.id];
                    return isSem1 ? res?.semester1.semesterScore : res?.semester2.semesterScore;
                  })
                  .filter((v): v is number => typeof v === 'number');
                const subAvg = subScores.length > 0 ? subScores.reduce((a, b) => a + b, 0) / subScores.length : null;
                return (
                  <td key={sub.id} className="font-mono font-bold text-center">
                    {formatScore(subAvg, 2, '—')}
                  </td>
                );
              })}
              <td className="font-mono font-black bg-blue-200 text-blue-950">
                {formatScore(averages.total, 2, '—')}
              </td>
              <td className="font-mono font-black bg-indigo-200 text-indigo-950">
                {formatScore(averages.avg, 2, '—')}
              </td>
              <td colSpan={2} className="text-center font-mono text-2xs text-slate-700">
                {averages.completeCount}/{students.length} ຄົນ
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary note & formula explanation */}
      <div className="flex items-center justify-between text-3xs text-slate-600 bg-slate-50 border border-slate-300 p-2 rounded my-2">
        <div>
          <strong>ສູດຄິດໄລ່:</strong> ຄະແນນພາກຮຽນ = (ຄະແນນສະເລ່ຍ 4 ເດືອນ + ຄະແນນສອບເສັງ) / 2
        </div>
        <div>
          <span>ສູງສຸດ: <strong className="font-mono text-emerald-800">{formatScore(averages.max, 2, '—')}</strong></span>
          <span className="mx-2">•</span>
          <span>ຕ່ຳສຸດ: <strong className="font-mono text-red-800">{formatScore(averages.min, 2, '—')}</strong></span>
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
