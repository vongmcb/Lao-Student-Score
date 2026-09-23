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

interface PDFIndividualScoreReportProps {
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  student: Student;
  allClassStudents: Student[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scoresMap: Record<string, Record<string, Record<string, number | null>>>;
  printedBy?: string;
}

export const PDFIndividualScoreReport: React.FC<PDFIndividualScoreReportProps> = ({
  school,
  schoolYear,
  classRoom,
  student,
  allClassStudents,
  subjects,
  periods,
  scoresMap,
  printedBy
}) => {
  const activeSubjects = useMemo(() => subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order), [subjects]);

  // Compute this student's summary and class ranking
  const { summary, rankAnnual } = useMemo(() => {
    const list = allClassStudents.map(st => {
      const pMap = scoresMap[st.id] || {};
      return calculateStudentSubjectScores(st.id, pMap, activeSubjects, periods, st);
    });
    const ranked = calculateClassStudentRankings(list);
    const target = ranked.find(s => s.studentId === student.id) || list.find(s => s.studentId === student.id);
    return {
      summary: target,
      rankAnnual: target?.rankAnnual ?? null
    };
  }, [allClassStudents, student.id, scoresMap, activeSubjects, periods]);

  return (
    <div className="excel-report-sheet p-6 bg-white text-slate-900 font-lao min-h-[297mm] max-w-[210mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2">
      {/* Official Header */}
      <PDFReportHeader
        title="ໃບລາຍງານຜົນການຮຽນນັກຮຽນ (Individual Student Report)"
        subtitle="ໃບແຈ້ງຄະແນນ ແລະ ຜົນການສຶກສາລາຍບຸກຄົນ"
        school={school}
        schoolYear={schoolYear}
        classRoom={classRoom}
      />

      {/* Student Profile Card (Excel Box style - Section 12 Specification) */}
      <div className="border border-slate-700 bg-slate-50/50 p-2.5 my-2.5 text-2xs leading-relaxed">
        <div className="grid grid-cols-4 gap-x-3 gap-y-1">
          {/* Row 1 */}
          <div>
            <span className="text-slate-600 font-medium">ລຳດັບ:</span>{' '}
            <strong className="font-mono text-slate-900 font-bold">#{student.studentNumber || student.rollNumber}</strong>
          </div>
          <div>
            <span className="text-slate-600 font-medium">ລະຫັດນັກຮຽນ:</span>{' '}
            <strong className="font-mono text-slate-900">{student.studentId || `ST-${String(student.studentNumber || student.rollNumber).padStart(4, '0')}`}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-slate-600 font-medium">ຊື່ ແລະ ນາມສະກຸນ:</span>{' '}
            <strong className="text-xs text-slate-950 font-bold">
              {student.prefix || student.title} {student.firstName} {student.lastName}
            </strong>
          </div>

          {/* Row 2 */}
          <div>
            <span className="text-slate-600 font-medium">ຊົນເຜົ່າ:</span>{' '}
            <strong className="text-slate-900 font-semibold">{student.ethnicity || 'ລາວ'}</strong>
          </div>
          <div>
            <span className="text-slate-600 font-medium">ວັນເດືອນປີເກີດ:</span>{' '}
            <strong className="font-mono text-slate-900">{student.dateOfBirth || student.dob || '—'}</strong>
          </div>
          <div>
            <span className="text-slate-600 font-medium">ຊັ້ນ / ຫ້ອງຮຽນ:</span>{' '}
            <strong className="text-blue-900 font-bold">{classRoom?.grade} {classRoom?.name}</strong>
          </div>
          <div>
            <span className="text-slate-600 font-medium">ອັນດັບທີໃນຫ້ອງ:</span>{' '}
            <strong className="font-mono text-amber-900 font-black">
              {rankAnnual !== null ? `ທີ ${rankAnnual}` : '—'}
            </strong>
          </div>

          {/* Row 3 */}
          <div className="col-span-2">
            <span className="text-slate-600 font-medium">ບ່ອນເກີດ:</span>{' '}
            <span className="text-slate-800">
              {student.birthplace?.village || student.village || '—'}, {student.birthplace?.district || student.district || '—'}, {student.birthplace?.province || student.province || '—'}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-600 font-medium">ທີ່ຢູ່ປັດຈຸບັນ:</span>{' '}
            <span className="text-slate-800">
              {student.currentAddress?.village || student.village || '—'}, {student.currentAddress?.district || student.district || '—'}, {student.currentAddress?.province || student.province || '—'}
            </span>
          </div>

          {/* Row 4 */}
          <div className="col-span-2">
            <span className="text-slate-600 font-medium">ຊື່ພໍ່ / ອາຊີບ:</span>{' '}
            <span className="text-slate-800 font-medium">
              {student.father?.firstName ? `${student.father.firstName} ${student.father.lastName || ''}` : (student.fatherInfo || '—')}
              {student.father?.occupation ? ` (ອາຊີບ: ${student.father.occupation})` : ''}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-600 font-medium">ຊື່ແມ່ / ອາຊີບ:</span>{' '}
            <span className="text-slate-800 font-medium">
              {student.mother?.firstName ? `${student.mother.firstName} ${student.mother.lastName || ''}` : (student.motherInfo || '—')}
              {student.mother?.occupation ? ` (ອາຊີບ: ${student.mother.occupation})` : ''}
            </span>
          </div>

          {/* Row 5 */}
          <div className="col-span-4">
            <span className="text-slate-600 font-medium">ເບີໂທຜູ້ປົກຄອງ:</span>{' '}
            <strong className="font-mono text-teal-800 font-bold">{student.guardianPhone || student.phone || '—'}</strong>
          </div>
        </div>
      </div>

      {/* Main Subjects Table: All months, exams, semesters, and annual */}
      <div className="overflow-x-auto my-2">
        <table className="excel-table excel-table-dense text-3xs w-full text-center">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th rowSpan={2} className="w-6 py-1 px-0.5">ລ/ດ</th>
              <th rowSpan={2} className="py-1 px-1.5 text-left w-28">ລາຍວິຊາ</th>
              <th colSpan={7} className="py-0.5 bg-blue-50 text-blue-950">
                ພາກຮຽນທີ I
              </th>
              <th colSpan={7} className="py-0.5 bg-indigo-50 text-indigo-950">
                ພາກຮຽນທີ II
              </th>
              <th rowSpan={2} className="w-11 py-1 px-1 bg-emerald-100 text-emerald-950 font-black">
                ໝົດປີ
              </th>
            </tr>
            <tr className="bg-slate-100 text-slate-700">
              <th className="py-0.5 px-0.5">09</th>
              <th className="py-0.5 px-0.5">10</th>
              <th className="py-0.5 px-0.5">11</th>
              <th className="py-0.5 px-0.5">12</th>
              <th className="py-0.5 px-0.5 bg-blue-100/50">ສະເລ່ຍ I</th>
              <th className="py-0.5 px-0.5 bg-blue-100/40">ເສັງ I</th>
              <th className="py-0.5 px-0.5 bg-blue-600 text-white font-bold">ພາກ I</th>
              <th className="py-0.5 px-0.5">02</th>
              <th className="py-0.5 px-0.5">03</th>
              <th className="py-0.5 px-0.5">04</th>
              <th className="py-0.5 px-0.5">05</th>
              <th className="py-0.5 px-0.5 bg-indigo-100/50">ສະເລ່ຍ II</th>
              <th className="py-0.5 px-0.5 bg-indigo-100/40">ເສັງ II</th>
              <th className="py-0.5 px-0.5 bg-indigo-600 text-white font-bold">ພາກ II</th>
            </tr>
          </thead>
          <tbody>
            {activeSubjects.map((sub, idx) => {
              const res = summary?.subjectResults[sub.id];

              return (
                <tr key={sub.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  <td className="text-slate-500 font-mono py-1">{idx + 1}</td>
                  <td className="text-left font-medium whitespace-nowrap px-1.5 py-1">
                    {sub.name}
                  </td>

                  {/* Sem 1 Months */}
                  {['09', '10', '11', '12'].map(m => (
                    <td key={m} className="font-mono text-center py-1">
                      {formatScore(res?.periodScores[m], 1, '—')}
                    </td>
                  ))}
                  <td className="font-mono font-semibold bg-blue-50/30 text-blue-900 py-1">
                    {res?.sem1Monthly.isComplete ? formatScore(res.sem1Monthly.monthlyAvg, 2) : '—'}
                  </td>
                  <td className="font-mono font-semibold bg-blue-50/20 text-blue-900 py-1">
                    {formatScore(res?.exam1, 1, '—')}
                  </td>
                  <td className="font-mono font-bold bg-blue-50/60 text-blue-950 py-1">
                    {res?.semester1.isComplete ? formatScore(res.semester1.semesterScore, 2) : '—'}
                  </td>

                  {/* Sem 2 Months */}
                  {['02', '03', '04', '05'].map(m => (
                    <td key={m} className="font-mono text-center py-1">
                      {formatScore(res?.periodScores[m], 1, '—')}
                    </td>
                  ))}
                  <td className="font-mono font-semibold bg-indigo-50/30 text-indigo-900 py-1">
                    {res?.sem2Monthly.isComplete ? formatScore(res.sem2Monthly.monthlyAvg, 2) : '—'}
                  </td>
                  <td className="font-mono font-semibold bg-indigo-50/20 text-indigo-900 py-1">
                    {formatScore(res?.exam2, 1, '—')}
                  </td>
                  <td className="font-mono font-bold bg-indigo-50/60 text-indigo-950 py-1">
                    {res?.semester2.isComplete ? formatScore(res.semester2.semesterScore, 2) : '—'}
                  </td>

                  {/* Annual */}
                  <td className="font-mono font-black bg-emerald-50/80 text-emerald-950 py-1">
                    {res?.isAnnualComplete ? formatScore(res.annualScore, 2) : '—'}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="bg-slate-100 font-bold border-t-2 border-slate-600 text-slate-950 text-2xs">
              <td colSpan={2} className="text-right px-2 py-1 uppercase">
                ຄະແນນລວມ:
              </td>
              <td colSpan={6} className="text-center text-3xs text-slate-500">
                (ຄົບ {summary?.validSubjectCountSem1 || 0} ວິຊາ)
              </td>
              <td className="font-mono font-bold bg-blue-100 text-blue-950">
                {summary?.totalSemester1 !== null ? formatScore(summary?.totalSemester1 ?? null, 2) : '—'}
              </td>
              <td colSpan={6} className="text-center text-3xs text-slate-500">
                (ຄົບ {summary?.validSubjectCountSem2 || 0} ວິຊາ)
              </td>
              <td className="font-mono font-bold bg-indigo-100 text-indigo-950">
                {summary?.totalSemester2 !== null ? formatScore(summary?.totalSemester2 ?? null, 2) : '—'}
              </td>
              <td className="font-mono font-black bg-emerald-100 text-emerald-950">
                {summary?.totalAnnual !== null ? formatScore(summary?.totalAnnual ?? null, 2) : '—'}
              </td>
            </tr>

            {/* Average Row */}
            <tr className="bg-slate-200 font-bold text-slate-950 text-2xs">
              <td colSpan={2} className="text-right px-2 py-1 uppercase">
                ຄະແນນສະເລ່ຍ:
              </td>
              <td colSpan={6} className="text-right pr-2 text-3xs text-blue-900 font-bold">
                ສະເລ່ຍ ພາກ I:
              </td>
              <td className="font-mono font-black bg-blue-600 text-white">
                {summary?.avgSemester1 !== null ? formatScore(summary?.avgSemester1 ?? null, 2) : '—'}
              </td>
              <td colSpan={6} className="text-right pr-2 text-3xs text-indigo-900 font-bold">
                ສະເລ່ຍ ພາກ II:
              </td>
              <td className="font-mono font-black bg-indigo-600 text-white">
                {summary?.avgSemester2 !== null ? formatScore(summary?.avgSemester2 ?? null, 2) : '—'}
              </td>
              <td className="font-mono font-black bg-emerald-600 text-white">
                {summary?.avgAnnual !== null ? formatScore(summary?.avgAnnual ?? null, 2) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Summary Score Callout Box */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs p-2.5 bg-slate-50 border border-slate-300 rounded my-3">
        <div className="p-1 bg-white border border-slate-200 rounded">
          <span className="block text-3xs text-slate-500">ສະເລ່ຍ ພາກຮຽນ I</span>
          <strong className="text-sm font-mono text-blue-900 font-bold">
            {summary?.avgSemester1 !== null ? formatScore(summary?.avgSemester1 ?? null, 2) : '—'}
          </strong>
        </div>
        <div className="p-1 bg-white border border-slate-200 rounded">
          <span className="block text-3xs text-slate-500">ສະເລ່ຍ ພາກຮຽນ II</span>
          <strong className="text-sm font-mono text-indigo-900 font-bold">
            {summary?.avgSemester2 !== null ? formatScore(summary?.avgSemester2 ?? null, 2) : '—'}
          </strong>
        </div>
        <div className="p-1 bg-emerald-50 border border-emerald-300 rounded">
          <span className="block text-3xs text-emerald-800 font-semibold">ສະເລ່ຍໝົດປີ (Annual)</span>
          <strong className="text-sm font-mono text-emerald-950 font-black">
            {summary?.avgAnnual !== null ? formatScore(summary?.avgAnnual ?? null, 2) : '—'}
          </strong>
        </div>
        <div className="p-1 bg-amber-50 border border-amber-300 rounded">
          <span className="block text-3xs text-amber-800 font-semibold">ອັນດັບທີໃນຫ້ອງ</span>
          <strong className="text-sm font-mono text-amber-950 font-black">
            {rankAnnual !== null ? `ທີ ${rankAnnual}` : '—'}
          </strong>
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
