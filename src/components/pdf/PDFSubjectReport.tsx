import React, { useMemo } from 'react';
import { Student, ClassRoom, Subject, ScorePeriod, School, SchoolYear } from '../../types';
import { PDFReportHeader } from './PDFReportHeader';
import { PDFReportSignatures } from './PDFReportSignatures';
import { PDFReportFooter } from './PDFReportFooter';
import {
  calculateStudentSubjectScores,
  formatScore
} from '../../services/calculations/scoreEngine';

interface PDFSubjectReportProps {
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  subject: Subject;
  mode: 'single_period' | 'annual_summary';
  selectedPeriodCode?: string; // "09", "10", "11", "12", "sem1", "02", "03", "04", "05", "sem2", "annual"
  periodName?: string;
  students: Student[];
  periods: ScorePeriod[];
  scoresMap: Record<string, Record<string, Record<string, number | null>>>;
  subjectTeacherName?: string;
  printedBy?: string;
}

export const PDFSubjectReport: React.FC<PDFSubjectReportProps> = ({
  school,
  schoolYear,
  classRoom,
  subject,
  mode,
  selectedPeriodCode = 'annual',
  periodName,
  students,
  periods,
  scoresMap,
  subjectTeacherName,
  printedBy
}) => {
  // Compute per-student breakdown for this subject
  const studentRows = useMemo(() => {
    return students.map(st => {
      const pMap = scoresMap[st.id] || {};
      const fullRes = calculateStudentSubjectScores(st.id, pMap, [subject], periods, st);
      const subRes = fullRes.subjectResults[subject.id];

      // Score for single period mode
      let targetScore: number | null = null;
      let isScoreComplete = false;

      if (selectedPeriodCode === 'sem1') {
        targetScore = subRes?.semester1.semesterScore ?? null;
        isScoreComplete = subRes?.semester1.isComplete ?? false;
      } else if (selectedPeriodCode === 'sem2') {
        targetScore = subRes?.semester2.semesterScore ?? null;
        isScoreComplete = subRes?.semester2.isComplete ?? false;
      } else if (selectedPeriodCode === 'annual') {
        targetScore = subRes?.annualScore ?? null;
        isScoreComplete = subRes?.isAnnualComplete ?? false;
      } else {
        // Raw period (e.g. "09", "10", "11", "12", "exam1", "02", etc.)
        const raw = pMap[subject.id]?.[selectedPeriodCode];
        targetScore = typeof raw === 'number' && !isNaN(raw) ? raw : null;
        isScoreComplete = targetScore !== null;
      }

      return {
        student: st,
        subRes,
        targetScore,
        isScoreComplete,
        rank: null as number | null
      };
    });
  }, [students, scoresMap, subject, periods, selectedPeriodCode]);

  // Competition ranking for single period
  const rankedRows = useMemo(() => {
    const list = [...studentRows];
    const valid = list
      .filter(r => r.isScoreComplete && r.targetScore !== null)
      .sort((a, b) => (b.targetScore ?? 0) - (a.targetScore ?? 0));

    let currentRank = 1;
    for (let i = 0; i < valid.length; i++) {
      if (i > 0 && Math.abs((valid[i].targetScore ?? 0) - (valid[i - 1].targetScore ?? 0)) < 0.0001) {
        valid[i].rank = valid[i - 1].rank;
      } else {
        valid[i].rank = currentRank;
      }
      currentRank++;
    }

    return list;
  }, [studentRows]);

  // Annual mode ranking
  const rankedAnnualRows = useMemo(() => {
    const list = [...studentRows];
    const valid = list
      .filter(r => r.subRes?.isAnnualComplete && r.subRes?.annualScore !== null)
      .sort((a, b) => (b.subRes?.annualScore ?? 0) - (a.subRes?.annualScore ?? 0));

    let currentRank = 1;
    for (let i = 0; i < valid.length; i++) {
      if (
        i > 0 &&
        Math.abs((valid[i].subRes?.annualScore ?? 0) - (valid[i - 1].subRes?.annualScore ?? 0)) < 0.0001
      ) {
        valid[i].rank = valid[i - 1].rank;
      } else {
        valid[i].rank = currentRank;
      }
      currentRank++;
    }

    return list;
  }, [studentRows]);

  // Stats for single period mode
  const stats = useMemo(() => {
    const validScores = studentRows
      .filter(r => r.isScoreComplete && r.targetScore !== null)
      .map(r => r.targetScore as number);
    const missingCount = studentRows.filter(r => !r.isScoreComplete || r.targetScore === null).length;

    return {
      studentCount: students.length,
      completeCount: validScores.length,
      missingCount,
      highest: validScores.length > 0 ? Math.max(...validScores) : null,
      lowest: validScores.length > 0 ? Math.min(...validScores) : null,
      average: validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : null
    };
  }, [studentRows, students.length]);

  return (
    <div className="excel-report-sheet p-6 bg-white text-slate-900 font-lao min-h-[210mm] max-w-[297mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2">
      {/* Official Header */}
      <PDFReportHeader
        title={`ລາຍງານຄະແນນຕາມລາຍວິຊາ: ວິຊາ ${subject.name}`}
        subtitle={
          mode === 'annual_summary'
            ? 'ໃບສັງລວມຄະແນນປະຈຳສົກຮຽນ ສຳລັບຄູສອນປະຈຳວິຊາ (Subject Teacher Annual Sheet)'
            : `ໃບຄະແນນປະຈຳ ${periodName || selectedPeriodCode} ສຳລັບຄູສອນປະຈຳວິຊາ`
        }
        school={school}
        schoolYear={schoolYear}
        classRoom={classRoom}
        subjectName={subject.name}
        periodName={mode === 'annual_summary' ? 'ສະຫຼຸບທັງປີ (Annual)' : periodName || selectedPeriodCode}
      />

      {mode === 'single_period' ? (
        /* MODE 1: Single Period Table */
        <div className="my-3">
          <div className="overflow-x-auto">
            <table className="excel-table text-xs w-full text-center">
              <thead>
                <tr className="bg-slate-200 text-slate-900 font-bold">
                  <th className="w-12 py-2 px-1">ລ/ດ</th>
                  <th className="w-16 py-2 px-1">ເລກທີ</th>
                  <th className="w-28 py-2 px-2">Student ID</th>
                  <th className="py-2 px-3 text-left">ຊື່ ແລະ ນາມສະກຸນ</th>
                  <th className="w-28 py-2 px-2 bg-blue-100 text-blue-950 font-black">
                    ຄະແນນ ({periodName || selectedPeriodCode})
                  </th>
                  <th className="w-20 py-2 px-2 bg-amber-100 text-amber-950 font-black">
                    ອັນດັບ
                  </th>
                </tr>
              </thead>
              <tbody>
                {rankedRows.map((row, idx) => (
                  <tr key={row.student.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    <td className="text-slate-500 font-mono py-1.5">{idx + 1}</td>
                    <td className="font-mono font-semibold py-1.5">#{row.student.rollNumber}</td>
                    <td className="font-mono text-slate-600 text-2xs py-1.5">{row.student.studentId}</td>
                    <td className="text-left font-medium whitespace-nowrap px-3 py-1.5">
                      {row.student.title} {row.student.firstName} {row.student.lastName}
                    </td>
                    <td className="font-mono font-extrabold bg-blue-50/50 text-blue-950 py-1.5 text-sm">
                      {row.isScoreComplete ? formatScore(row.targetScore, 2) : <span className="text-amber-700 text-xs font-semibold">ຍັງບໍ່ຄົບ</span>}
                    </td>
                    <td className="font-mono font-black bg-amber-50/50 text-amber-900 py-1.5">
                      {row.rank !== null ? row.rank : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 7 Bottom Statistics Summary */}
          <div className="grid grid-cols-5 gap-3 text-2xs p-3 bg-slate-50 border border-slate-300 rounded text-slate-800 my-4 font-medium">
            <div>
              <span className="block text-3xs text-slate-500">ຈຳນວນນັກຮຽນ:</span>
              <strong className="text-sm font-mono">{stats.studentCount}</strong> ຄົນ
            </div>
            <div>
              <span className="block text-3xs text-slate-500">ຄະແນນສູງສຸດ:</span>
              <strong className="text-sm font-mono text-emerald-800">{formatScore(stats.highest, 2, '—')}</strong>
            </div>
            <div>
              <span className="block text-3xs text-slate-500">ຄະແນນຕ່ຳສຸດ:</span>
              <strong className="text-sm font-mono text-red-800">{formatScore(stats.lowest, 2, '—')}</strong>
            </div>
            <div>
              <span className="block text-3xs text-slate-500">ຄະແນນສະເລ່ຍ:</span>
              <strong className="text-sm font-mono text-blue-900">{formatScore(stats.average, 2, '—')}</strong>
            </div>
            <div>
              <span className="block text-3xs text-slate-500">ຈຳນວນຄົນທີ່ຂາດຄະແນນ:</span>
              <strong className={`text-sm font-mono ${stats.missingCount > 0 ? 'text-amber-700' : 'text-slate-700'}`}>
                {stats.missingCount}
              </strong> ຄົນ
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2: Section 8 — PDF ຕາມວິຊາ ສະຫຼຸບທັງປີ (Annual Subject Teacher Breakdown) */
        <div className="overflow-x-auto my-2">
          <table className="excel-table excel-table-dense text-2xs w-full text-center">
            <thead>
              <tr className="bg-slate-200 text-slate-900 font-bold">
                <th rowSpan={2} className="w-8 py-1 px-1">ລ/ດ</th>
                <th rowSpan={2} className="w-10 py-1 px-1">ເລກທີ</th>
                <th rowSpan={2} className="w-40 py-1 px-2 text-left">ຊື່ ແລະ ນາມສະກຸນ</th>
                <th colSpan={7} className="py-1 bg-blue-50 text-blue-950">
                  ພາກຮຽນທີ I
                </th>
                <th colSpan={7} className="py-1 bg-indigo-50 text-indigo-950">
                  ພາກຮຽນທີ II
                </th>
                <th rowSpan={2} className="w-14 py-1 px-1 bg-emerald-100 text-emerald-950 font-black">
                  ໝົດປີ
                </th>
                <th rowSpan={2} className="w-10 py-1 px-1 bg-amber-100 text-amber-950 font-black">
                  ອັນດັບ
                </th>
              </tr>
              <tr className="bg-slate-100 text-slate-700 text-3xs">
                {/* Sem 1 */}
                <th className="py-0.5 px-1">09</th>
                <th className="py-0.5 px-1">10</th>
                <th className="py-0.5 px-1">11</th>
                <th className="py-0.5 px-1">12</th>
                <th className="py-0.5 px-1 bg-blue-100/50">ສະເລ່ຍ I</th>
                <th className="py-0.5 px-1 bg-blue-100/40">ເສັງ I</th>
                <th className="py-0.5 px-1 bg-blue-600 text-white font-bold">ພາກ I</th>
                {/* Sem 2 */}
                <th className="py-0.5 px-1">02</th>
                <th className="py-0.5 px-1">03</th>
                <th className="py-0.5 px-1">04</th>
                <th className="py-0.5 px-1">05</th>
                <th className="py-0.5 px-1 bg-indigo-100/50">ສະເລ່ຍ II</th>
                <th className="py-0.5 px-1 bg-indigo-100/40">ເສັງ II</th>
                <th className="py-0.5 px-1 bg-indigo-600 text-white font-bold">ພາກ II</th>
              </tr>
            </thead>
            <tbody>
              {rankedAnnualRows.map((row, idx) => {
                const res = row.subRes;
                return (
                  <tr key={row.student.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                    <td className="text-slate-500 font-mono">{idx + 1}</td>
                    <td className="font-mono font-semibold">#{row.student.rollNumber}</td>
                    <td className="text-left font-medium whitespace-nowrap px-2">
                      {row.student.title} {row.student.firstName} {row.student.lastName}
                    </td>

                    {/* Sem 1 Months */}
                    {['09', '10', '11', '12'].map(m => (
                      <td key={m} className="font-mono text-center">
                        {formatScore(res?.periodScores[m], 1, '—')}
                      </td>
                    ))}
                    <td className="font-mono font-semibold bg-blue-50/30 text-blue-900">
                      {res?.sem1Monthly.isComplete ? formatScore(res.sem1Monthly.monthlyAvg, 2) : '—'}
                    </td>
                    <td className="font-mono font-semibold bg-blue-50/20 text-blue-900">
                      {formatScore(res?.exam1, 1, '—')}
                    </td>
                    <td className="font-mono font-bold bg-blue-50/60 text-blue-950">
                      {res?.semester1.isComplete ? formatScore(res.semester1.semesterScore, 2) : '—'}
                    </td>

                    {/* Sem 2 Months */}
                    {['02', '03', '04', '05'].map(m => (
                      <td key={m} className="font-mono text-center">
                        {formatScore(res?.periodScores[m], 1, '—')}
                      </td>
                    ))}
                    <td className="font-mono font-semibold bg-indigo-50/30 text-indigo-900">
                      {res?.sem2Monthly.isComplete ? formatScore(res.sem2Monthly.monthlyAvg, 2) : '—'}
                    </td>
                    <td className="font-mono font-semibold bg-indigo-50/20 text-indigo-900">
                      {formatScore(res?.exam2, 1, '—')}
                    </td>
                    <td className="font-mono font-bold bg-indigo-50/60 text-indigo-950">
                      {res?.semester2.isComplete ? formatScore(res.semester2.semesterScore, 2) : '—'}
                    </td>

                    {/* Annual */}
                    <td className="font-mono font-black bg-emerald-50/80 text-emerald-950">
                      {res?.isAnnualComplete ? formatScore(res.annualScore, 2) : '—'}
                    </td>

                    {/* Rank */}
                    <td className="font-mono font-black bg-amber-50/50 text-amber-900">
                      {row.rank !== null ? row.rank : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Signatures */}
      <PDFReportSignatures
        showSubjectTeacher={true}
        subjectTeacherName={subjectTeacherName}
        homeroomTeacherName={classRoom?.homeroomTeacher}
      />

      {/* Footer */}
      <PDFReportFooter printedBy={printedBy} />
    </div>
  );
};
