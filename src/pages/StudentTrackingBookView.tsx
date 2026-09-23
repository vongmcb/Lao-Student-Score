import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  User,
  Calendar,
  Award,
  Clock,
  HeartHandshake,
  Printer,
  ChevronRight,
  ChevronLeft,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  Student,
  ClassRoom,
  Subject,
  ScorePeriod,
  ScoreRecord,
  SchoolYear,
  AttendanceRecord,
  BehaviorRecord,
  School
} from '../types';
import {
  buildNestedScoresMap,
  calculateStudentSubjectScores,
  formatScore,
  StudentCalculatedSummary
} from '../services/calculations/scoreEngine';
import { calculateClassStudentRankings } from '../services/calculations/rankingEngine';
import {
  getAttendanceForStudent,
  saveAttendance,
  getBehaviorForStudent,
  saveBehavior
} from '../services/dataService';

interface StudentTrackingBookProps {
  students: Student[];
  classes: ClassRoom[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scores: ScoreRecord[];
  schoolYears: SchoolYear[];
  schoolInfo: School | null;
  selectedStudentId?: string;
  onSelectStudent: (id: string) => void;
}

export const StudentTrackingBookView: React.FC<StudentTrackingBookProps> = ({
  students,
  classes,
  subjects,
  periods,
  scores,
  schoolYears,
  schoolInfo,
  selectedStudentId: propStudentId,
  onSelectStudent
}) => {
  const [activeStudentId, setActiveStudentId] = useState<string>(
    propStudentId || students[0]?.id || ''
  );

  // Keep synced with prop
  useEffect(() => {
    if (propStudentId) {
      setActiveStudentId(propStudentId);
    }
  }, [propStudentId]);

  // Attendance & Behavior state
  const [attendanceSem1, setAttendanceSem1] = useState<AttendanceRecord>({
    studentId: '',
    schoolYearId: '',
    classId: '',
    semester: 1,
    absentUnexcused: 0,
    absentExcused: 0,
    notes: ''
  });

  const [behaviorSem1, setBehaviorSem1] = useState<BehaviorRecord>({
    studentId: '',
    schoolYearId: '',
    classId: '',
    semester: 1,
    conductScore: 'ດີຫຼາຍ',
    laborScore: 'ດີຫຼາຍ',
    notes: ''
  });

  const [isSavingExtra, setIsSavingExtra] = useState(false);
  const [extraNotice, setExtraNotice] = useState<string | null>(null);

  // Current student object
  const currentStudent = students.find(s => s.id === activeStudentId) || students[0];
  const currentClass = classes.find(c => c.id === currentStudent?.classId);
  const currentYear = schoolYears.find(y => y.id === currentStudent?.schoolYearId) || schoolYears[0];
  const activeSubjects = useMemo(() => subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order), [subjects]);

  // Load attendance & behavior when student changes
  useEffect(() => {
    if (!currentStudent) return;
    const loadExtra = async () => {
      try {
        const attList = await getAttendanceForStudent(currentStudent.id, currentStudent.schoolYearId);
        const sem1Att = attList.find(a => a.semester === 1) || {
          studentId: currentStudent.id,
          schoolYearId: currentStudent.schoolYearId,
          classId: currentStudent.classId,
          semester: 1,
          absentUnexcused: 0,
          absentExcused: 0,
          notes: ''
        };
        setAttendanceSem1(sem1Att);

        const behList = await getBehaviorForStudent(currentStudent.id, currentStudent.schoolYearId);
        const sem1Beh = behList.find(b => b.semester === 1) || {
          studentId: currentStudent.id,
          schoolYearId: currentStudent.schoolYearId,
          classId: currentStudent.classId,
          semester: 1,
          conductScore: 'ດີຫຼາຍ',
          laborScore: 'ດີຫຼາຍ',
          notes: ''
        };
        setBehaviorSem1(sem1Beh);
      } catch (err) {
        console.error(err);
      }
    };
    loadExtra();
  }, [currentStudent]);

  // Scores calculations using BUILD 2 engines
  const nestedScores = useMemo(() => {
    return buildNestedScoresMap(scores);
  }, [scores]);

  const classStudents = useMemo(() => {
    return currentClass ? students.filter(s => s.classId === currentClass.id) : [];
  }, [students, currentClass]);

  const rankedSummaries = useMemo(() => {
    const list = classStudents.map(st => {
      const pMap = nestedScores[st.id] || {};
      return calculateStudentSubjectScores(st.id, pMap, activeSubjects, periods, st);
    });
    return calculateClassStudentRankings(list);
  }, [classStudents, nestedScores, activeSubjects, periods]);

  const currentSummary = rankedSummaries.find(s => s.studentId === currentStudent?.id);

  const handleSaveAttendanceAndBehavior = async () => {
    if (!currentStudent) return;
    setIsSavingExtra(true);
    setExtraNotice(null);
    try {
      await saveAttendance({
        ...attendanceSem1,
        studentId: currentStudent.id,
        schoolYearId: currentStudent.schoolYearId,
        classId: currentStudent.classId
      });
      await saveBehavior({
        ...behaviorSem1,
        studentId: currentStudent.id,
        schoolYearId: currentStudent.schoolYearId,
        classId: currentStudent.classId
      });
      setExtraNotice('ບັນທຶກຂໍ້ມູນການຂາດຮຽນ ແລະ ຄຸນສົມບັດສຳເລັດແລ້ວ');
      setTimeout(() => setExtraNotice(null), 3000);
    } catch (err) {
      console.error(err);
      alert('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຂໍ້ມູນ');
    } finally {
      setIsSavingExtra(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Student navigation
  const currentIndex = classStudents.findIndex(s => s.id === currentStudent?.id);
  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevId = classStudents[currentIndex - 1].id;
      setActiveStudentId(prevId);
      onSelectStudent(prevId);
    }
  };
  const handleNext = () => {
    if (currentIndex >= 0 && currentIndex < classStudents.length - 1) {
      const nextId = classStudents[currentIndex + 1].id;
      setActiveStudentId(nextId);
      onSelectStudent(nextId);
    }
  };

  if (!currentStudent) {
    return (
      <div className="p-12 text-center text-slate-400 bg-white rounded-3xl font-lao">
        ບໍ່ພົບຂໍ້ມູນນັກຮຽນ. ກະລຸນາເພີ່ມນັກຮຽນໃນລະບົບກ່ອນ.
      </div>
    );
  }

  // Periods grouped
  const sem1Months = ['09', '10', '11', '12'];
  const sem2Months = ['02', '03', '04', '05'];

  return (
    <div className="space-y-6 font-lao">
      {/* Top Controls / Action Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1.5">
            <BookOpen className="w-3.5 h-3.5" /> ປຶ້ມຕິດຕາມການຮຽນນັກຮຽນ (Student Tracking Book)
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ປຶ້ມຕິດຕາມ ແລະ ໃບລາຍງານຜົນການຮຽນ
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            ມາດຕະຖານຕາມແບບພິມຂອງກະຊວງສຶກສາທິການ ແລະ ກິລາ
          </p>
        </div>

        {/* Student selector & navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition"
              title="ຄົນກ່ອນໜ້າ"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <select
              value={activeStudentId}
              onChange={(e) => {
                setActiveStudentId(e.target.value);
                onSelectStudent(e.target.value);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classStudents.map(s => (
                <option key={s.id} value={s.id}>
                  #{s.rollNumber} {s.title} {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
            <button
              onClick={handleNext}
              disabled={currentIndex >= classStudents.length - 1}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 transition"
              title="ຄົນຖັດໄປ"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>ພິມປຶ້ມຕິດຕາມ (Print)</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE OFFICIAL BOOKLET CONTAINER */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm print:p-0 print:border-none print:shadow-none space-y-6">
        {/* Official Header */}
        <div className="text-center space-y-1.5 border-b border-slate-200 pb-5">
          <p className="text-xs font-semibold tracking-wider text-slate-700">
            ສາທາລະນະລັດ ປະຊາທິປະໄຕ ປະຊາຊົນລາວ
          </p>
          <p className="text-xs font-semibold tracking-widest text-slate-700">
            ສັນຕິພາບ ເອກະລາດ ປະຊາທິປະໄຕ ເອກະພາບ ວັດທະນະຖາວອນ
          </p>
          <div className="pt-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 uppercase">
              {schoolInfo?.name || 'ໂຮງຮຽນ ມັດທະຍົມສົມບູນ'}
            </h2>
            <div className="inline-block px-4 py-1 bg-blue-50 text-blue-900 rounded-full font-bold text-xs mt-1 border border-blue-200">
              ປຶ້ມຕິດຕາມ ແລະ ໃບລາຍງານຜົນການຮຽນ ສົກຮຽນ {currentYear?.name || '2025-2026'}
            </div>
          </div>
        </div>

        {/* Student Bio Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl text-xs border border-slate-200/80">
          <div>
            <span className="text-slate-400 block text-2xs">ເລກທີ / Student ID:</span>
            <span className="font-bold text-slate-800 text-sm font-mono">
              #{currentStudent.rollNumber} • {currentStudent.studentId}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">ຊື່ ແລະ ນາມສະກຸນ:</span>
            <span className="font-bold text-slate-900 text-sm">
              {currentStudent.title} {currentStudent.firstName} {currentStudent.lastName}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">ຫ້ອງຮຽນ:</span>
            <span className="font-bold text-blue-700 text-sm">
              {currentClass?.name || '—'} ({currentClass?.grade || ''})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">ອັນດັບທີໃນຫ້ອງ (ທັງປີ):</span>
            <span className="font-extrabold text-amber-700 text-sm">
              {currentSummary?.rankAnnual ? `ທີ ${currentSummary.rankAnnual}` : 'ລໍຖ້າຄະແນນຄົບ'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">ເພດ / ວັນເກີດ:</span>
            <span className="font-medium text-slate-700">
              {currentStudent.gender === 'female' ? 'ຍິງ' : 'ຊາຍ'} • {currentStudent.dob || '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">ທີ່ຢູ່ປະຈຸບັນ:</span>
            <span className="font-medium text-slate-700">
              {currentStudent.village || '—'}, {currentStudent.district || ''}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">ຊື່ພໍ່ / ຊື່ແມ່:</span>
            <span className="font-medium text-slate-700">
              {currentStudent.fatherInfo || '—'} / {currentStudent.motherInfo || '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-2xs">ເບີໂທຕິດຕໍ່:</span>
            <span className="font-medium text-slate-700 font-mono">
              {currentStudent.phone || '—'}
            </span>
          </div>
        </div>

        {/* Detailed Score Table */}
        <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-center">
              <tr>
                <th rowSpan={2} className="py-2.5 px-2 text-center w-10 border-r border-slate-200">ລ/ດ</th>
                <th rowSpan={2} className="py-2.5 px-3 text-left w-36 border-r border-slate-200">ລາຍວິຊາ</th>
                <th colSpan={7} className="py-1.5 bg-blue-50 text-blue-900 border-r border-slate-200">
                  ພາກຮຽນທີ I
                </th>
                <th colSpan={7} className="py-1.5 bg-indigo-50 text-indigo-900 border-r border-slate-200">
                  ພາກຮຽນທີ II
                </th>
                <th rowSpan={2} className="py-2.5 px-2 bg-emerald-50 text-emerald-950 font-bold w-16">
                  ສະເລ່ຍປີ
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-2xs">
                {/* Sem 1 */}
                <th className="py-1 px-1.5">09</th>
                <th className="py-1 px-1.5">10</th>
                <th className="py-1 px-1.5">11</th>
                <th className="py-1 px-1.5">12</th>
                <th className="py-1 px-1.5 bg-blue-100/50 text-blue-900">ສະເລ່ຍເດືອນ</th>
                <th className="py-1 px-1.5 bg-blue-100/40 text-blue-900">ເສັງ I</th>
                <th className="py-1 px-1.5 bg-blue-600 text-white font-bold border-r border-slate-200">ພາກ I</th>

                {/* Sem 2 */}
                <th className="py-1 px-1.5">02</th>
                <th className="py-1 px-1.5">03</th>
                <th className="py-1 px-1.5">04</th>
                <th className="py-1 px-1.5">05</th>
                <th className="py-1 px-1.5 bg-indigo-100/50 text-indigo-900">ສະເລ່ຍເດືອນ</th>
                <th className="py-1 px-1.5 bg-indigo-100/40 text-indigo-900">ເສັງ II</th>
                <th className="py-1 px-1.5 bg-indigo-600 text-white font-bold border-r border-slate-200">ພາກ II</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {activeSubjects.map((sub, idx) => {
                const res = currentSummary?.subjectResults[sub.id];

                return (
                  <tr key={sub.id} className="hover:bg-blue-50/20">
                    <td className="py-2 px-2 text-center text-slate-400 font-mono border-r border-slate-100">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap">
                      {sub.name}
                    </td>

                    {/* Sem 1 Months */}
                    {sem1Months.map(m => (
                      <td key={m} className="py-2 px-1 text-center font-mono text-slate-700 border-r border-slate-100">
                        {formatScore(res?.periodScores[m], 1, '—')}
                      </td>
                    ))}
                    {/* Sem 1 Monthly Avg */}
                    <td className="py-2 px-1 text-center font-mono font-semibold text-blue-700 bg-blue-50/30 border-r border-slate-100">
                      {res?.sem1Monthly.isComplete ? formatScore(res.sem1Monthly.monthlyAvg, 2) : '—'}
                    </td>
                    {/* Sem 1 Exam */}
                    <td className="py-2 px-1 text-center font-mono font-semibold text-blue-900 bg-blue-50/20 border-r border-slate-100">
                      {formatScore(res?.exam1, 1, '—')}
                    </td>
                    {/* Sem 1 Final */}
                    <td className="py-2 px-1.5 text-center font-mono font-bold text-blue-900 bg-blue-50/60 border-r border-slate-200">
                      {res?.semester1.isComplete ? formatScore(res.semester1.semesterScore, 2) : '—'}
                    </td>

                    {/* Sem 2 Months */}
                    {sem2Months.map(m => (
                      <td key={m} className="py-2 px-1 text-center font-mono text-slate-700 border-r border-slate-100">
                        {formatScore(res?.periodScores[m], 1, '—')}
                      </td>
                    ))}
                    {/* Sem 2 Monthly Avg */}
                    <td className="py-2 px-1 text-center font-mono font-semibold text-indigo-700 bg-indigo-50/30 border-r border-slate-100">
                      {res?.sem2Monthly.isComplete ? formatScore(res.sem2Monthly.monthlyAvg, 2) : '—'}
                    </td>
                    {/* Sem 2 Exam */}
                    <td className="py-2 px-1 text-center font-mono font-semibold text-indigo-900 bg-indigo-50/20 border-r border-slate-100">
                      {formatScore(res?.exam2, 1, '—')}
                    </td>
                    {/* Sem 2 Final */}
                    <td className="py-2 px-1.5 text-center font-mono font-bold text-indigo-900 bg-indigo-50/60 border-r border-slate-200">
                      {res?.semester2.isComplete ? formatScore(res.semester2.semesterScore, 2) : '—'}
                    </td>

                    {/* Annual */}
                    <td className="py-2 px-2 text-center font-mono font-bold text-emerald-900 bg-emerald-50/40">
                      {res?.isAnnualComplete ? formatScore(res.annualScore, 2) : '—'}
                    </td>
                  </tr>
                );
              })}

              {/* Aggregates Summary Rows */}
              {/* Total Row */}
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td colSpan={2} className="py-2 px-3 text-right text-slate-800 border-r border-slate-200">
                  ຄະແນນລວມ:
                </td>
                <td colSpan={6} className="text-center text-slate-400 text-2xs border-r border-slate-200">
                  (ຄົບ {currentSummary?.validSubjectCountSem1 || 0} ວິຊາ)
                </td>
                <td className="py-2 px-1.5 text-center font-mono font-bold text-blue-950 bg-blue-100 border-r border-slate-200">
                  {currentSummary?.totalSemester1 !== null ? formatScore(currentSummary?.totalSemester1 ?? null, 2) : '—'}
                </td>
                <td colSpan={6} className="text-center text-slate-400 text-2xs border-r border-slate-200">
                  (ຄົບ {currentSummary?.validSubjectCountSem2 || 0} ວິຊາ)
                </td>
                <td className="py-2 px-1.5 text-center font-mono font-bold text-indigo-950 bg-indigo-100 border-r border-slate-200">
                  {currentSummary?.totalSemester2 !== null ? formatScore(currentSummary?.totalSemester2 ?? null, 2) : '—'}
                </td>
                <td className="py-2 px-2 text-center font-mono font-bold text-emerald-950 bg-emerald-100">
                  {currentSummary?.totalAnnual !== null ? formatScore(currentSummary?.totalAnnual ?? null, 2) : '—'}
                </td>
              </tr>

              {/* Average Row */}
              <tr className="bg-slate-200/90 font-bold border-t border-slate-300">
                <td colSpan={2} className="py-2 px-3 text-right text-slate-900 border-r border-slate-300">
                  ຄະແນນສະເລ່ຍ:
                </td>
                <td colSpan={6} className="text-right pr-2 text-blue-900 text-xs border-r border-slate-300">
                  ສະເລ່ຍ ພາກ I:
                </td>
                <td className="py-2 px-1.5 text-center font-mono font-bold text-white bg-blue-600 border-r border-slate-300 text-sm">
                  {currentSummary?.avgSemester1 !== null ? formatScore(currentSummary?.avgSemester1 ?? null, 2) : '—'}
                </td>
                <td colSpan={6} className="text-right pr-2 text-indigo-900 text-xs border-r border-slate-300">
                  ສະເລ່ຍ ພາກ II:
                </td>
                <td className="py-2 px-1.5 text-center font-mono font-bold text-white bg-indigo-600 border-r border-slate-300 text-sm">
                  {currentSummary?.avgSemester2 !== null ? formatScore(currentSummary?.avgSemester2 ?? null, 2) : '—'}
                </td>
                <td className="py-2 px-2 text-center font-mono font-bold text-white bg-emerald-600 text-sm">
                  {currentSummary?.avgAnnual !== null ? formatScore(currentSummary?.avgAnnual ?? null, 2) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section: Attendance & Behavior Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Attendance Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>ສະຖິຕິການຂາດຮຽນ (Attendance)</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold text-2xs">
                  ຂາດບໍ່ມີເຫດຜົນ (ວັນ):
                </label>
                <input
                  type="number"
                  min="0"
                  value={attendanceSem1.absentUnexcused}
                  onChange={(e) => setAttendanceSem1({ ...attendanceSem1, absentUnexcused: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-semibold text-2xs">
                  ຂາດມີເຫດຜົນ/ລາ (ວັນ):
                </label>
                <input
                  type="number"
                  min="0"
                  value={attendanceSem1.absentExcused}
                  onChange={(e) => setAttendanceSem1({ ...attendanceSem1, absentExcused: parseInt(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-semibold text-2xs">
                ໝາຍເຫດການມາຮຽນ:
              </label>
              <input
                type="text"
                value={attendanceSem1.notes || ''}
                placeholder="ເຊັ່ນ: ມາຮຽນເປັນປົກກະຕິ"
                onChange={(e) => setAttendanceSem1({ ...attendanceSem1, notes: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Behavior Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-xs text-slate-800 border-b border-slate-200 pb-2">
              <HeartHandshake className="w-4 h-4 text-emerald-600" />
              <span>ການຕີລາຄາຄຸນສົມບັດ & ແຮງງານ</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-1 font-semibold text-2xs">
                  ຄຸນສົມບັດ:
                </label>
                <select
                  value={behaviorSem1.conductScore}
                  onChange={(e) => setBehaviorSem1({ ...behaviorSem1, conductScore: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="ດີຫຼາຍ">ດີຫຼາຍ</option>
                  <option value="ດີ">ດີ</option>
                  <option value="ປານກາງ">ປານກາງ</option>
                  <option value="ອ່ອນ">ອ່ອນ</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-semibold text-2xs">
                  ອອກແຮງງານ:
                </label>
                <select
                  value={behaviorSem1.laborScore}
                  onChange={(e) => setBehaviorSem1({ ...behaviorSem1, laborScore: e.target.value as any })}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold"
                >
                  <option value="ດີຫຼາຍ">ດີຫຼາຍ</option>
                  <option value="ດີ">ດີ</option>
                  <option value="ປານກາງ">ປານກາງ</option>
                  <option value="ອ່ອນ">ອ່ອນ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-semibold text-2xs">
                ຄຳເຫັນຂອງຄູປະຈຳຫ້ອງ:
              </label>
              <input
                type="text"
                value={behaviorSem1.notes || ''}
                placeholder="ເຊັ່ນ: ດຸໝັ່ນ, ຕັ້ງໃຈຮຽນ, ມີນ້ຳໃຈຊ່ວຍເຫຼືອໝູ່ເພື່ອນ"
                onChange={(e) => setBehaviorSem1({ ...behaviorSem1, notes: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action bar for extra fields */}
        <div className="flex items-center justify-between no-print pt-2">
          {extraNotice && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> {extraNotice}
            </span>
          )}
          <div className="ml-auto">
            <button
              onClick={handleSaveAttendanceAndBehavior}
              disabled={isSavingExtra}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingExtra ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກສະຖິຕິ & ຄຸນສົມບັດ'}</span>
            </button>
          </div>
        </div>

        {/* Official Signatures Row */}
        <div className="grid grid-cols-3 gap-6 pt-10 text-center text-xs text-slate-700">
          <div>
            <p className="font-bold">ຜູ້ປົກຄອງນັກຮຽນ</p>
            <p className="text-2xs text-slate-400 mt-0.5">ເຊັນ ແລະ ວັນທີ</p>
            <div className="mt-14 border-b border-dashed border-slate-300 mx-6"></div>
          </div>
          <div>
            <p className="font-bold">ຄູປະຈຳຫ້ອງ</p>
            <p className="text-2xs text-slate-400 mt-0.5">ເຊັນ ແລະ ລົງຊື່ແຈ້ງ</p>
            <div className="mt-14 border-b border-dashed border-slate-300 mx-6"></div>
          </div>
          <div>
            <p className="font-bold">ຜູ້ອຳນວຍການໂຮງຮຽນ</p>
            <p className="text-2xs text-slate-400 mt-0.5">ເຊັນ ແລະ ປະທັບຕາ</p>
            <div className="mt-14 border-b border-dashed border-slate-300 mx-6"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
