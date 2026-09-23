import React, { useMemo } from 'react';
import {
  Student,
  ClassRoom,
  Subject,
  ScorePeriod,
  School,
  SchoolYear,
  AttendanceRecord,
  BehaviorRecord
} from '../../types';
import { PDFReportHeader } from './PDFReportHeader';
import { PDFReportSignatures } from './PDFReportSignatures';
import { PDFReportFooter } from './PDFReportFooter';
import {
  calculateStudentSubjectScores,
  formatScore
} from '../../services/calculations/scoreEngine';
import { calculateClassStudentRankings } from '../../services/calculations/rankingEngine';

interface PDFTrackingBookReportProps {
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  student: Student;
  allClassStudents: Student[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scoresMap: Record<string, Record<string, Record<string, number | null>>>;
  attendanceRecords?: AttendanceRecord[];
  behaviorRecords?: BehaviorRecord[];
  printedBy?: string;
}

export const PDFTrackingBookReport: React.FC<PDFTrackingBookReportProps> = ({
  school,
  schoolYear,
  classRoom,
  student,
  allClassStudents,
  subjects,
  periods,
  scoresMap,
  attendanceRecords = [],
  behaviorRecords = [],
  printedBy
}) => {
  const activeSubjects = useMemo(() => subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order), [subjects]);

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

  // Attendance for Sem 1 and Sem 2
  const attSem1 = attendanceRecords.find(a => a.studentId === student.id && a.semester === 1);
  const attSem2 = attendanceRecords.find(a => a.studentId === student.id && a.semester === 2);

  // Behavior & Conduct for Sem 1 and Sem 2
  const behSem1 = behaviorRecords.find(b => b.studentId === student.id && b.semester === 1);
  const behSem2 = behaviorRecords.find(b => b.studentId === student.id && b.semester === 2);

  return (
    <div className="excel-report-sheet p-6 bg-white text-slate-900 font-lao min-h-[210mm] max-w-[297mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-2">
      {/* Official Header */}
      <PDFReportHeader
        title="ປຶ້ມຕິດຕາມຜົນການຮຽນນັກຮຽນ (Student Tracking Book)"
        subtitle="ແບບພິມປຶ້ມຕິດຕາມການຮຽນ ແລະ ຄຸນສົມບັດ ຕາມຫຼັກສູດກະຊວງສຶກສາທິການ ແລະ ກິລາ"
        school={school}
        schoolYear={schoolYear}
        classRoom={classRoom}
      />

      {/* Student Biography Details (Lao Ministry Style Excel Box) */}
      <div className="border border-slate-700 bg-slate-50/50 p-2 text-2xs my-2">
        <div className="grid grid-cols-4 gap-x-4 gap-y-1">
          <div>
            <span className="text-slate-500">ເລກທີ:</span>{' '}
            <strong className="font-mono text-slate-900">#{student.studentNumber || student.rollNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500">ລະຫັດນັກຮຽນ:</span>{' '}
            <strong className="font-mono text-slate-900">{student.studentId || `ST-${String(student.studentNumber || student.rollNumber).padStart(4, '0')}`}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">ຊື່ ແລະ ນາມສະກຸນ:</span>{' '}
            <strong className="text-xs text-slate-950 font-bold">
              {student.prefix || student.title} {student.firstName} {student.lastName}
            </strong>
          </div>

          <div>
            <span className="text-slate-500">ຊົນເຜົ່າ:</span>{' '}
            <strong className="text-slate-900">{student.ethnicity || 'ລາວ'}</strong>
          </div>
          <div>
            <span className="text-slate-500">ວັນເດືອນປີເກີດ:</span>{' '}
            <strong className="text-slate-900">{student.dateOfBirth || student.dob || '—'}</strong>
          </div>
          <div>
            <span className="text-slate-500">ບ່ອນເກີດ:</span>{' '}
            <span className="text-slate-800">
              {student.birthplace?.village || student.village || ''} {student.birthplace?.district ? `, ${student.birthplace.district}` : ''}
            </span>
          </div>
          <div>
            <span className="text-slate-500">ເບີໂທຜູ້ປົກຄອງ:</span>{' '}
            <strong className="font-mono text-slate-900">{student.guardianPhone || student.phone || '—'}</strong>
          </div>

          <div className="col-span-2">
            <span className="text-slate-500">ທີ່ຢູ່ປັດຈຸບັນ:</span>{' '}
            <span className="text-slate-800">
              {student.currentAddress?.village || student.village || ''} {student.currentAddress?.district ? `, ${student.currentAddress.district}` : ''} {student.currentAddress?.province ? `, ${student.currentAddress.province}` : ''}
            </span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-500">ພໍ່ / ແມ່ / ອາຊີບ:</span>{' '}
            <span className="text-slate-800 font-medium">
              {student.father?.firstName ? `ພໍ່: ${student.father.firstName} (${student.father.occupation || '—'}), ` : (student.fatherInfo ? `ພໍ່: ${student.fatherInfo}, ` : '')}
              {student.mother?.firstName ? `ແມ່: ${student.mother.firstName} (${student.mother.occupation || '—'})` : (student.motherInfo ? `ແມ່: ${student.motherInfo}` : '')}
            </span>
          </div>
        </div>
      </div>

      {/* Main Score Matrix */}
      <div className="overflow-x-auto my-2">
        <table className="excel-table excel-table-dense text-3xs w-full text-center">
          <thead>
            <tr className="bg-slate-200 text-slate-900 font-bold">
              <th rowSpan={2} className="w-6 py-1 px-0.5">ລ/ດ</th>
              <th rowSpan={2} className="py-1 px-1.5 text-left w-32">ລາຍວິຊາ</th>
              <th colSpan={7} className="py-0.5 bg-blue-50 text-blue-950">
                ພາກຮຽນທີ I
              </th>
              <th colSpan={7} className="py-0.5 bg-indigo-50 text-indigo-950">
                ພາກຮຽນທີ II
              </th>
              <th rowSpan={2} className="w-12 py-1 px-1 bg-emerald-100 text-emerald-950 font-black">
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
                  <td className="text-slate-500 font-mono py-0.5">{idx + 1}</td>
                  <td className="text-left font-medium whitespace-nowrap px-1.5 py-0.5">
                    {sub.name}
                  </td>

                  {/* Sem 1 Months */}
                  {['09', '10', '11', '12'].map(m => (
                    <td key={m} className="font-mono text-center py-0.5">
                      {formatScore(res?.periodScores[m], 1, '—')}
                    </td>
                  ))}
                  <td className="font-mono font-semibold bg-blue-50/30 text-blue-900 py-0.5">
                    {res?.sem1Monthly.isComplete ? formatScore(res.sem1Monthly.monthlyAvg, 2) : '—'}
                  </td>
                  <td className="font-mono font-semibold bg-blue-50/20 text-blue-900 py-0.5">
                    {formatScore(res?.exam1, 1, '—')}
                  </td>
                  <td className="font-mono font-bold bg-blue-50/60 text-blue-950 py-0.5">
                    {res?.semester1.isComplete ? formatScore(res.semester1.semesterScore, 2) : '—'}
                  </td>

                  {/* Sem 2 Months */}
                  {['02', '03', '04', '05'].map(m => (
                    <td key={m} className="font-mono text-center py-0.5">
                      {formatScore(res?.periodScores[m], 1, '—')}
                    </td>
                  ))}
                  <td className="font-mono font-semibold bg-indigo-50/30 text-indigo-900 py-0.5">
                    {res?.sem2Monthly.isComplete ? formatScore(res.sem2Monthly.monthlyAvg, 2) : '—'}
                  </td>
                  <td className="font-mono font-semibold bg-indigo-50/20 text-indigo-900 py-0.5">
                    {formatScore(res?.exam2, 1, '—')}
                  </td>
                  <td className="font-mono font-bold bg-indigo-50/60 text-indigo-950 py-0.5">
                    {res?.semester2.isComplete ? formatScore(res.semester2.semesterScore, 2) : '—'}
                  </td>

                  {/* Annual */}
                  <td className="font-mono font-black bg-emerald-50/80 text-emerald-950 py-0.5">
                    {res?.isAnnualComplete ? formatScore(res.annualScore, 2) : '—'}
                  </td>
                </tr>
              );
            })}

            {/* Total Row */}
            <tr className="bg-slate-100 font-bold border-t border-slate-600 text-slate-950 text-2xs">
              <td colSpan={2} className="text-right px-2 py-0.5 uppercase">
                ຄະແນນລວມ:
              </td>
              <td colSpan={6} className="text-center text-3xs text-slate-500"></td>
              <td className="font-mono font-bold bg-blue-100 text-blue-950">
                {summary?.totalSemester1 !== null ? formatScore(summary?.totalSemester1 ?? null, 2) : '—'}
              </td>
              <td colSpan={6} className="text-center text-3xs text-slate-500"></td>
              <td className="font-mono font-bold bg-indigo-100 text-indigo-950">
                {summary?.totalSemester2 !== null ? formatScore(summary?.totalSemester2 ?? null, 2) : '—'}
              </td>
              <td className="font-mono font-black bg-emerald-100 text-emerald-950">
                {summary?.totalAnnual !== null ? formatScore(summary?.totalAnnual ?? null, 2) : '—'}
              </td>
            </tr>

            {/* Average Row */}
            <tr className="bg-slate-200 font-bold text-slate-950 text-2xs">
              <td colSpan={2} className="text-right px-2 py-0.5 uppercase">
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

      {/* Section 10 Bottom Tables: Attendance, Behavior, Labor & Teacher Remark */}
      <div className="grid grid-cols-3 gap-3 my-2 text-2xs">
        {/* Attendance */}
        <div className="border border-slate-500 rounded p-2 bg-slate-50/50">
          <h4 className="font-bold text-slate-900 mb-1 border-b pb-0.5">ສະຖິຕິການຂາດຮຽນ (Attendance)</h4>
          <table className="w-full text-center text-3xs border-collapse">
            <thead>
              <tr className="bg-slate-200 font-bold">
                <th className="border border-slate-400 p-0.5">ພາກຮຽນ</th>
                <th className="border border-slate-400 p-0.5">ຂາດມີເຫດຜົນ</th>
                <th className="border border-slate-400 p-0.5">ຂາດບໍ່ມີເຫດຜົນ</th>
                <th className="border border-slate-400 p-0.5">ລວມ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-0.5 font-semibold">ພາກ I</td>
                <td className="border border-slate-300 p-0.5 font-mono">{attSem1?.absentExcused ?? 0}</td>
                <td className="border border-slate-300 p-0.5 font-mono text-red-700">{attSem1?.absentUnexcused ?? 0}</td>
                <td className="border border-slate-300 p-0.5 font-mono font-bold">
                  {(attSem1?.absentExcused ?? 0) + (attSem1?.absentUnexcused ?? 0)}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-0.5 font-semibold">ພາກ II</td>
                <td className="border border-slate-300 p-0.5 font-mono">{attSem2?.absentExcused ?? 0}</td>
                <td className="border border-slate-300 p-0.5 font-mono text-red-700">{attSem2?.absentUnexcused ?? 0}</td>
                <td className="border border-slate-300 p-0.5 font-mono font-bold">
                  {(attSem2?.absentExcused ?? 0) + (attSem2?.absentUnexcused ?? 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Conduct & Labor */}
        <div className="border border-slate-500 rounded p-2 bg-slate-50/50">
          <h4 className="font-bold text-slate-900 mb-1 border-b pb-0.5">ຄຸນສົມບັດ & ອອກແຮງງານ</h4>
          <table className="w-full text-center text-3xs border-collapse">
            <thead>
              <tr className="bg-slate-200 font-bold">
                <th className="border border-slate-400 p-0.5">ພາກຮຽນ</th>
                <th className="border border-slate-400 p-0.5">ຄຸນສົມບັດ</th>
                <th className="border border-slate-400 p-0.5">ອອກແຮງງານ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-0.5 font-semibold">ພາກ I</td>
                <td className="border border-slate-300 p-0.5 font-bold text-emerald-800">
                  {behSem1?.conductScore || 'ດີ'}
                </td>
                <td className="border border-slate-300 p-0.5 font-bold text-blue-800">
                  {behSem1?.laborScore || 'ດີ'}
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-0.5 font-semibold">ພາກ II</td>
                <td className="border border-slate-300 p-0.5 font-bold text-emerald-800">
                  {behSem2?.conductScore || 'ດີ'}
                </td>
                <td className="border border-slate-300 p-0.5 font-bold text-blue-800">
                  {behSem2?.laborScore || 'ດີ'}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="mt-1 text-3xs text-slate-600">
            ອັນດັບໝົດປີ: <strong className="text-amber-900 font-bold">{rankAnnual ? `ທີ ${rankAnnual}` : '—'}</strong>
          </div>
        </div>

        {/* Teacher Comment */}
        <div className="border border-slate-500 rounded p-2 bg-slate-50/50 flex flex-col justify-between">
          <div>
            <h4 className="font-bold text-slate-900 mb-1 border-b pb-0.5">ຄຳເຫັນຂອງຄູປະຈຳຫ້ອງ</h4>
            <p className="text-3xs text-slate-700 italic min-h-[38px]">
              {behSem2?.notes || behSem1?.notes || 'ນັກຮຽນມີຄວາມດຸໝັ່ນ, ຕັ້ງໃຈຮ່ຳຮຽນ ແລະ ປະຕິບັດລະບຽບວິໄນຂອງໂຮງຮຽນໄດ້ດີ.'}
            </p>
          </div>
          <div className="text-right text-3xs text-slate-500">
            ຄູປະຈຳຫ້ອງ: {classRoom?.homeroomTeacher || '...............................'}
          </div>
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
