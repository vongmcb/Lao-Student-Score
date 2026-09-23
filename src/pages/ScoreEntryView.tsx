import React, { useState, useEffect } from 'react';
import {
  FileEdit,
  UserCheck,
  BookOpen,
  Save,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import { Student, ClassRoom, Subject, ScorePeriod, ScoreRecord, SchoolYear } from '../types';
import { saveSingleScore, saveBatchScores } from '../services/dataService';
import {
  validateScore,
  calculateStudentSubjectScores,
  formatScore,
  calculateMonthlyAverage,
  calculateSemesterScore,
  calculateAnnualScore
} from '../services/calculations/scoreEngine';

interface ScoreEntryProps {
  students: Student[];
  classes: ClassRoom[];
  subjects: Subject[];
  periods: ScorePeriod[];
  schoolYears: SchoolYear[];
  scores: ScoreRecord[];
  selectedClassId: string;
  targetStudentId?: string;
  onRefreshScores: () => void;
}

export const ScoreEntryView: React.FC<ScoreEntryProps> = ({
  students,
  classes,
  subjects,
  periods,
  schoolYears,
  scores,
  selectedClassId: initialClassId,
  targetStudentId,
  onRefreshScores
}) => {
  // Mode A: by subject, Mode B: by student
  const [entryMode, setEntryMode] = useState<'bySubject' | 'byStudent'>(
    targetStudentId ? 'byStudent' : 'bySubject'
  );

  // Common Selection states
  const [classId, setClassId] = useState<string>(
    initialClassId !== 'all' ? initialClassId : (classes[0]?.id || '')
  );
  const [schoolYearId, setSchoolYearId] = useState<string>(schoolYears[0]?.id || '');

  // Mode A Selection states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedPeriodCode, setSelectedPeriodCode] = useState<string>(periods[0]?.code || '09');

  // Mode B Selection state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    targetStudentId || students[0]?.id || ''
  );

  // Local draft inputs state
  // studentId -> string representation of score
  const [subjectDraftScores, setSubjectDraftScores] = useState<Record<string, string>>({});
  // In mode B: subjectId -> periodCode -> string representation
  const [studentDraftScores, setStudentDraftScores] = useState<Record<string, Record<string, string>>>({});

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Active subjects & students for current class
  const classStudents = students.filter(s => s.classId === classId);
  const activeSubjects = subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order);

  // Watch for external targetStudentId updates
  useEffect(() => {
    if (targetStudentId) {
      const st = students.find(s => s.id === targetStudentId);
      if (st) {
        setClassId(st.classId);
        setSelectedStudentId(targetStudentId);
        setEntryMode('byStudent');
      }
    }
  }, [targetStudentId, students]);

  // Sync draft state when selections change or incoming scores change
  useEffect(() => {
    if (entryMode === 'bySubject') {
      const drafts: Record<string, string> = {};
      classStudents.forEach(st => {
        const found = scores.find(
          s => s.studentId === st.id &&
               s.subjectId === selectedSubjectId &&
               s.periodId === selectedPeriodCode &&
               s.classId === classId
        );
        drafts[st.id] = found !== undefined && found.score !== null ? String(found.score) : '';
      });
      setSubjectDraftScores(drafts);
    } else {
      // byStudent
      const drafts: Record<string, Record<string, string>> = {};
      activeSubjects.forEach(sub => {
        drafts[sub.id] = {};
        periods.forEach(p => {
          const found = scores.find(
            s => s.studentId === selectedStudentId &&
                 s.subjectId === sub.id &&
                 s.periodId === p.code
          );
          drafts[sub.id][p.code] = found !== undefined && found.score !== null ? String(found.score) : '';
        });
      });
      setStudentDraftScores(drafts);
    }
    setValidationErrors({});
  }, [entryMode, classId, selectedSubjectId, selectedPeriodCode, selectedStudentId, scores]);

  // Mode A: Save all scores for the subject & period
  const handleSaveSubjectScores = async () => {
    setIsSaving(true);
    setSaveSuccessNotice(null);
    const newErrors: Record<string, string> = {};
    const recordsToSave: ScoreRecord[] = [];

    for (const st of classStudents) {
      const val = subjectDraftScores[st.id];
      if (val !== undefined && val !== '') {
        const { isValid, error, parsedValue } = validateScore(val);
        if (!isValid) {
          newErrors[st.id] = error || 'ຄະແນນບໍ່ຖືກຕ້ອງ';
        } else if (parsedValue !== null) {
          recordsToSave.push({
            studentId: st.id,
            subjectId: selectedSubjectId,
            classId,
            schoolYearId,
            periodId: selectedPeriodCode,
            score: parsedValue
          });
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setValidationErrors(newErrors);
      setIsSaving(false);
      return;
    }

    try {
      if (recordsToSave.length > 0) {
        await saveBatchScores(recordsToSave);
      }
      onRefreshScores();
      setSaveSuccessNotice('ບັນທຶກຄະແນນສຳເລັດແລ້ວ!');
      setTimeout(() => setSaveSuccessNotice(null), 3000);
    } catch (err) {
      console.error('Save error:', err);
      alert('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຄະແນນ');
    } finally {
      setIsSaving(false);
    }
  };

  // Mode B: Save all draft scores for current student
  const handleSaveAllStudentScores = async (andAdvanceNext: boolean = false) => {
    setIsSaving(true);
    setSaveSuccessNotice(null);

    const recordsToSave: ScoreRecord[] = [];
    const currentStudent = students.find(s => s.id === selectedStudentId);

    activeSubjects.forEach(sub => {
      periods.forEach(p => {
        const val = studentDraftScores[sub.id]?.[p.code];
        if (val !== undefined && val !== '') {
          const { isValid, parsedValue } = validateScore(val);
          if (isValid && parsedValue !== null) {
            recordsToSave.push({
              studentId: selectedStudentId,
              subjectId: sub.id,
              classId: currentStudent?.classId || classId,
              schoolYearId: currentStudent?.schoolYearId || schoolYearId,
              periodId: p.code,
              score: parsedValue
            });
          }
        }
      });
    });

    try {
      if (recordsToSave.length > 0) {
        await saveBatchScores(recordsToSave);
      }
      onRefreshScores();

      const currentIndex = classStudents.findIndex(s => s.id === selectedStudentId);
      const studentName = currentStudent ? `${currentStudent.title} ${currentStudent.firstName}` : '';

      if (andAdvanceNext) {
        if (currentIndex >= 0 && currentIndex < classStudents.length - 1) {
          const nextStudent = classStudents[currentIndex + 1];
          setSelectedStudentId(nextStudent.id);
          setSaveSuccessNotice(`ບັນທຶກ ${studentName} ສຳເລັດ → ໄປຄົນຕໍ່ໄປ: ${nextStudent.title} ${nextStudent.firstName}`);
        } else {
          setSaveSuccessNotice(`ບັນທຶກ ${studentName} ສຳເລັດ (ຮອດຄົນສຸດທ້າຍຂອງຫ້ອງແລ້ວ)`);
        }
      } else {
        setSaveSuccessNotice(`ບັນທຶກຄະແນນຂອງ ${studentName} ສຳເລັດແລ້ວ!`);
      }

      setTimeout(() => setSaveSuccessNotice(null), 3500);
    } catch (err) {
      console.error('Error saving student batch:', err);
      alert('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຄະແນນ');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save on individual cell blur in Mode B
  const handleSaveStudentCell = async (subjectId: string, periodCode: string, value: string) => {
    if (!selectedStudentId) return;
    if (value === '') return;

    const { isValid, error, parsedValue } = validateScore(value);
    if (!isValid || parsedValue === null) {
      setValidationErrors(prev => ({
        ...prev,
        [`${subjectId}_${periodCode}`]: error || 'ຄະແນນບໍ່ຖືກຕ້ອງ'
      }));
      return;
    }

    setValidationErrors(prev => {
      const copy = { ...prev };
      delete copy[`${subjectId}_${periodCode}`];
      return copy;
    });

    const currentStudent = students.find(s => s.id === selectedStudentId);

    const record: ScoreRecord = {
      studentId: selectedStudentId,
      subjectId,
      classId: currentStudent?.classId || classId,
      schoolYearId: currentStudent?.schoolYearId || schoolYearId,
      periodId: periodCode,
      score: parsedValue
    };

    try {
      await saveSingleScore(record);
      onRefreshScores();
    } catch (err) {
      console.error('Cell save error:', err);
    }
  };

  // Student navigation helpers
  const currentStudentIndex = classStudents.findIndex(s => s.id === selectedStudentId);
  const hasPreviousStudent = currentStudentIndex > 0;
  const hasNextStudent = currentStudentIndex >= 0 && currentStudentIndex < classStudents.length - 1;

  const handlePrevStudent = () => {
    if (hasPreviousStudent) {
      setSelectedStudentId(classStudents[currentStudentIndex - 1].id);
    }
  };

  const handleNextStudent = () => {
    if (hasNextStudent) {
      setSelectedStudentId(classStudents[currentStudentIndex + 1].id);
    }
  };

  return (
    <div className="space-y-6 font-lao">
      {/* Header & Mode Switcher */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1.5">
            <FileEdit className="w-3.5 h-3.5" /> ປ້ອນຄະແນນນັກຮຽນ
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ປ້ອນຄະແນນ (Score Entry)
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            ຮອງຮັບ 2 ວິທີ: ປ້ອນຕາມວິຊາ (Keyboard ໄວ) ຫຼື ປ້ອນຕາມນັກຮຽນ ພ້ອມປຸ່ມ "ບັນທຶກ ແລະ ໄປຄົນຕໍ່ໄປ"
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-2xl">
          <button
            onClick={() => setEntryMode('bySubject')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              entryMode === 'bySubject'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" /> ປ້ອນຕາມວິຊາ (ທັງຫ້ອງ)
          </button>
          <button
            onClick={() => setEntryMode('byStudent')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              entryMode === 'byStudent'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" /> ປ້ອນຕາມນັກຮຽນ (ທຸກວິຊາ)
          </button>
        </div>
      </div>

      {saveSuccessNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs sm:text-sm font-semibold animate-fadeIn shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Mode A: ປ້ອນຕາມວິຊາ (By Subject) */}
      {entryMode === 'bySubject' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div>
              <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">
                ຫ້ອງຮຽນ:
              </label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    ຫ້ອງ {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">
                ວິຊາຮຽນ:
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {activeSubjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code || 'SUB'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">
                ເດືອນ / ງວດສອບເສັງ:
              </label>
              <select
                value={selectedPeriodCode}
                onChange={(e) => setSelectedPeriodCode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <optgroup label="ພາກຮຽນ I">
                  {periods.filter(p => p.semester === 1).map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="ພາກຮຽນ II">
                  {periods.filter(p => p.semester === 2).map(p => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex items-end">
              <button
                id="btn-save-subject-scores"
                onClick={handleSaveSubjectScores}
                disabled={isSaving || classStudents.length === 0}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຄະແນນທັງໝົດ'}</span>
              </button>
            </div>
          </div>

          {/* Quick instructions & validation banner */}
          <div className="flex items-center justify-between text-xs text-slate-500 px-2">
            <span>💡 ປ້ອນຄະແນນ 0 - 10. ກົດ Enter ຫຼື ArrowDown ເພື່ອເລື່ອນໄປຄົນຖັດໄປອັດຕະໂນມັດ.</span>
            <span className="font-semibold text-blue-700">ນັກຮຽນ {classStudents.length} ຄົນ</span>
          </div>

          {/* Table with Keyboard Navigation */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-center">
                  <tr>
                    <th className="py-3 px-3 w-12 border-r border-slate-800">ລ/ດ</th>
                    <th className="py-3 px-3 w-16 border-r border-slate-800">ເລກທີ</th>
                    <th className="py-3 px-4 w-32 border-r border-slate-800">Student ID</th>
                    <th className="py-3 px-4 text-left border-r border-slate-800">ຊື່ ແລະ ນາມສະກຸນ</th>
                    <th className="py-3 px-4 w-48 border-r border-slate-800 bg-blue-700 text-white">
                      ຄະແນນ ({periods.find(p => p.code === selectedPeriodCode)?.name})
                    </th>
                    <th className="py-3 px-4 text-center">ສະຖານະການກວດສອບ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        ບໍ່ມີນັກຮຽນໃນຫ້ອງນີ້. ກະລຸນາເລືອກຫ້ອງອື່ນ ຫຼື ເພີ່ມນັກຮຽນ.
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((st, idx) => {
                      const val = subjectDraftScores[st.id] ?? '';
                      const error = validationErrors[st.id];
                      const numVal = parseFloat(val);
                      const isPassing = !isNaN(numVal) && numVal >= 5.0;

                      return (
                        <tr key={st.id} className="hover:bg-blue-50/30 transition">
                          <td className="py-2.5 px-3 font-semibold text-slate-400 text-center font-mono border-r border-slate-100">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-800 text-center font-mono border-r border-slate-100">
                            {st.rollNumber}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-2xs text-slate-500 border-r border-slate-100">
                            {st.studentId}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-900 border-r border-slate-100">
                            <span className="text-slate-500 font-normal mr-1">{st.title}</span>
                            {st.firstName} {st.lastName}
                          </td>
                          <td className="py-2.5 px-4 border-r border-slate-100 bg-blue-50/20">
                            <div className="relative">
                              <input
                                id={`score-input-${st.id}`}
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                min="0"
                                max="10"
                                value={val}
                                placeholder="—"
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setSubjectDraftScores(prev => ({
                                    ...prev,
                                    [st.id]: newVal
                                  }));
                                  const { isValid, error: errText } = validateScore(newVal);
                                  setValidationErrors(prev => {
                                    const copy = { ...prev };
                                    if (!isValid) copy[st.id] = errText || 'ຜິດພາດ';
                                    else delete copy[st.id];
                                    return copy;
                                  });
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    const nextSt = classStudents[idx + 1];
                                    if (nextSt) {
                                      const nextInput = document.getElementById(`score-input-${nextSt.id}`);
                                      nextInput?.focus();
                                    }
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    const prevSt = classStudents[idx - 1];
                                    if (prevSt) {
                                      const prevInput = document.getElementById(`score-input-${prevSt.id}`);
                                      prevInput?.focus();
                                    }
                                  }
                                }}
                                className={`w-32 px-3 py-1.5 text-center font-bold text-base rounded-xl border transition ${
                                  error
                                    ? 'border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-200'
                                    : val !== ''
                                    ? isPassing
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                      : 'border-amber-300 bg-amber-50 text-amber-800'
                                    : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500'
                                }`}
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {error ? (
                              <span className="text-2xs font-semibold text-rose-600 flex items-center justify-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                {error}
                              </span>
                            ) : val !== '' ? (
                              <span className="text-2xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                ຖືກຕ້ອງ ({isPassing ? 'ຜ່ານ' : 'ບໍ່ຜ່ານ'})
                              </span>
                            ) : (
                              <span className="text-2xs text-slate-400">ຍັງບໍ່ໄດ້ປ້ອນ</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Mode B: ປ້ອນຕາມນັກຮຽນ (By Student with Save & Next) */}
      {entryMode === 'byStudent' && (
        <div className="space-y-4">
          {/* Student Selector Bar */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">
                  ຫ້ອງຮຽນ:
                </label>
                <select
                  value={classId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    setClassId(newClassId);
                    const firstSt = students.find(s => s.classId === newClassId);
                    if (firstSt) setSelectedStudentId(firstSt.id);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold px-3 py-2 text-slate-800"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      ຫ້ອງ {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 uppercase mb-1">
                  ເລືອກນັກຮຽນ ({currentStudentIndex + 1}/{classStudents.length}):
                </label>
                <select
                  id="select-single-student"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold px-3 py-2 text-slate-800"
                >
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.rollNumber} {s.title} {s.firstName} {s.lastName} ({s.studentId})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Navigation & Save Actions */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-end">
              <button
                onClick={handlePrevStudent}
                disabled={!hasPreviousStudent}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                title="ຄົນກ່ອນໜ້າ"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>ກ່ອນໜ້າ</span>
              </button>

              <button
                onClick={handleNextStudent}
                disabled={!hasNextStudent}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                title="ຄົນຖັດໄປ"
              >
                <span>ຖັດໄປ</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSaveAllStudentScores(false)}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ບັນທຶກ</span>
              </button>

              <button
                id="btn-save-and-next"
                onClick={() => handleSaveAllStudentScores(true)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                <span>ບັນທຶກ ແລະ ໄປຄົນຕໍ່ໄປ (Save & Next)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Student Profile Banner */}
          {(() => {
            const currentStudent = students.find(s => s.id === selectedStudentId);
            if (!currentStudent) {
              return (
                <div className="p-8 text-center text-slate-400 bg-white rounded-3xl">
                  ບໍ່ພົບນັກຮຽນທີ່ເລືອກ
                </div>
              );
            }

            return (
              <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-lg font-bold">
                    {currentStudent.rollNumber}
                  </div>
                  <div>
                    <div className="text-xs text-blue-300 font-semibold">
                      ເລກທີ #{currentStudent.rollNumber} • ລະຫັດ: {currentStudent.studentId}
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold">
                      {currentStudent.title} {currentStudent.firstName} {currentStudent.lastName}
                    </h2>
                    <p className="text-2xs text-slate-300 mt-0.5">
                      ຫ້ອງ: {classes.find(c => c.id === currentStudent.classId)?.name} • ເພດ: {currentStudent.gender === 'female' ? 'ຍິງ' : 'ຊາຍ'} • ເບີໂທ: {currentStudent.phone || '—'}
                    </p>
                  </div>
                </div>

                <div className="text-2xs bg-slate-800/80 border border-slate-700 px-3.5 py-2 rounded-xl">
                  ⚡ ບັນທຶກອັດຕະໂນມັດເມື່ອແກ້ໄຂ Cell ແລະ ສາມາດກົດ "ບັນທຶກ ແລະ ໄປຄົນຕໍ່ໄປ" ໄດ້ສະເໝີ
                </div>
              </div>
            );
          })()}

          {/* Matrix Table: Subject x Periods */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-center">
                  <tr>
                    <th rowSpan={2} className="py-3 px-3 w-10 border-r border-slate-800">ລ/ດ</th>
                    <th rowSpan={2} className="py-3 px-3 w-40 text-left border-r border-slate-800 sticky left-0 bg-slate-900 z-10">
                      ລາຍວິຊາ
                    </th>
                    {/* Semester 1 Header */}
                    <th colSpan={6} className="py-2 px-2 bg-blue-700 border-r border-slate-800">
                      ພາກຮຽນທີ I
                    </th>
                    {/* Semester 2 Header */}
                    <th colSpan={6} className="py-2 px-2 bg-indigo-700 border-r border-slate-800">
                      ພາກຮຽນທີ II
                    </th>
                    <th rowSpan={2} className="py-3 px-3 bg-emerald-700 text-white font-bold border-r border-slate-800">
                      ສະເລ່ຍໝົດປີ
                    </th>
                    <th rowSpan={2} className="py-3 px-3 bg-slate-800">
                      ສະຖານະ
                    </th>
                  </tr>
                  <tr className="bg-slate-800 border-b border-slate-700 text-2xs">
                    {/* Semester 1 sub-columns */}
                    <th className="py-1.5 px-2">09</th>
                    <th className="py-1.5 px-2">10</th>
                    <th className="py-1.5 px-2">11</th>
                    <th className="py-1.5 px-2">12</th>
                    <th className="py-1.5 px-2 bg-blue-800 text-blue-200 font-bold">ເສັງ I</th>
                    <th className="py-1.5 px-2 bg-blue-600 text-white font-bold border-r border-slate-700">
                      ສະເລ່ຍ I
                    </th>

                    {/* Semester 2 sub-columns */}
                    <th className="py-1.5 px-2">02</th>
                    <th className="py-1.5 px-2">03</th>
                    <th className="py-1.5 px-2">04</th>
                    <th className="py-1.5 px-2">05</th>
                    <th className="py-1.5 px-2 bg-indigo-800 text-indigo-200 font-bold">ເສັງ II</th>
                    <th className="py-1.5 px-2 bg-indigo-600 text-white font-bold border-r border-slate-700">
                      ສະເລ່ຍ II
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {activeSubjects.map((sub, sIdx) => {
                    // Extract subject period values for real-time calculation preview
                    const studentMap: Record<string, number | null> = {};
                    periods.forEach(p => {
                      const raw = studentDraftScores[sub.id]?.[p.code];
                      studentMap[p.code] = raw !== undefined && raw !== '' ? parseFloat(raw) : null;
                    });

                    const m1 = calculateMonthlyAverage(
                      studentMap,
                      periods.filter(p => p.semester === 1 && !p.isExam)
                    );
                    const s1 = calculateSemesterScore(m1, studentMap['exam1']);

                    const m2 = calculateMonthlyAverage(
                      studentMap,
                      periods.filter(p => p.semester === 2 && !p.isExam)
                    );
                    const s2 = calculateSemesterScore(m2, studentMap['exam2']);

                    const annual = calculateAnnualScore(s1, s2);

                    const isEven = sIdx % 2 === 0;

                    return (
                      <tr key={sub.id} className={`${isEven ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition`}>
                        <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-100">
                          {sIdx + 1}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900 border-r border-slate-100 whitespace-nowrap sticky left-0 bg-inherit z-10">
                          {sub.name}
                        </td>

                        {/* Month 09, 10, 11, 12 */}
                        {['09', '10', '11', '12'].map((pCode, pIdx) => {
                          const val = studentDraftScores[sub.id]?.[pCode] ?? '';
                          return (
                            <td key={pCode} className="p-1 text-center border-r border-slate-100">
                              <input
                                id={`cell-${sIdx}-${pIdx}`}
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                min="0"
                                max="10"
                                value={val}
                                placeholder="—"
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setStudentDraftScores(prev => ({
                                    ...prev,
                                    [sub.id]: {
                                      ...prev[sub.id],
                                      [pCode]: newVal
                                    }
                                  }));
                                }}
                                onBlur={(e) => handleSaveStudentCell(sub.id, pCode, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    const nextCell = document.getElementById(`cell-${sIdx + 1}-${pIdx}`);
                                    nextCell?.focus();
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    const prevCell = document.getElementById(`cell-${sIdx - 1}-${pIdx}`);
                                    prevCell?.focus();
                                  }
                                }}
                                className="w-12 py-1.5 text-center font-bold text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              />
                            </td>
                          );
                        })}

                        {/* Exam 1 */}
                        <td className="p-1 text-center bg-blue-50/40 border-r border-slate-100">
                          <input
                            id={`cell-${sIdx}-4`}
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            max="10"
                            value={studentDraftScores[sub.id]?.['exam1'] ?? ''}
                            placeholder="—"
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setStudentDraftScores(prev => ({
                                ...prev,
                                [sub.id]: {
                                  ...prev[sub.id],
                                  exam1: newVal
                                }
                              }));
                            }}
                            onBlur={(e) => handleSaveStudentCell(sub.id, 'exam1', e.target.value)}
                            className="w-12 py-1.5 text-center font-bold text-sm rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </td>

                        {/* Semester 1 Computed Preview */}
                        <td className="py-2 px-2 text-center font-bold font-mono text-blue-900 border-r border-slate-100 bg-blue-50/70">
                          {s1.isComplete ? formatScore(s1.semesterScore, 2) : <span className="text-2xs text-slate-400 font-normal">{s1.statusLabel}</span>}
                        </td>

                        {/* Month 02, 03, 04, 05 */}
                        {['02', '03', '04', '05'].map((pCode, pIdx) => {
                          const val = studentDraftScores[sub.id]?.[pCode] ?? '';
                          return (
                            <td key={pCode} className="p-1 text-center border-r border-slate-100">
                              <input
                                id={`cell-${sIdx}-${pIdx + 5}`}
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                min="0"
                                max="10"
                                value={val}
                                placeholder="—"
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setStudentDraftScores(prev => ({
                                    ...prev,
                                    [sub.id]: {
                                      ...prev[sub.id],
                                      [pCode]: newVal
                                    }
                                  }));
                                }}
                                onBlur={(e) => handleSaveStudentCell(sub.id, pCode, e.target.value)}
                                className="w-12 py-1.5 text-center font-bold text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                              />
                            </td>
                          );
                        })}

                        {/* Exam 2 */}
                        <td className="p-1 text-center bg-indigo-50/40 border-r border-slate-100">
                          <input
                            id={`cell-${sIdx}-9`}
                            type="number"
                            inputMode="decimal"
                            step="0.1"
                            min="0"
                            max="10"
                            value={studentDraftScores[sub.id]?.['exam2'] ?? ''}
                            placeholder="—"
                            onChange={(e) => {
                              const newVal = e.target.value;
                              setStudentDraftScores(prev => ({
                                ...prev,
                                [sub.id]: {
                                  ...prev[sub.id],
                                  exam2: newVal
                                }
                              }));
                            }}
                            onBlur={(e) => handleSaveStudentCell(sub.id, 'exam2', e.target.value)}
                            className="w-12 py-1.5 text-center font-bold text-sm rounded-lg border border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                        </td>

                        {/* Semester 2 Computed Preview */}
                        <td className="py-2 px-2 text-center font-bold font-mono text-indigo-900 border-r border-slate-100 bg-indigo-50/70">
                          {s2.isComplete ? formatScore(s2.semesterScore, 2) : <span className="text-2xs text-slate-400 font-normal">{s2.statusLabel}</span>}
                        </td>

                        {/* Annual Computed Preview */}
                        <td className="py-2 px-2 text-center font-bold font-mono text-emerald-900 border-r border-slate-100 bg-emerald-50/60">
                          {annual.isComplete ? formatScore(annual.annualScore, 2) : <span className="text-2xs text-slate-400 font-normal">{annual.statusLabel}</span>}
                        </td>

                        {/* Subject Status */}
                        <td className="py-2 px-2 text-center whitespace-nowrap">
                          {annual.isComplete ? (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700">
                              ຄົບແລ້ວ
                            </span>
                          ) : s1.status === 'awaiting_exam' || s2.status === 'awaiting_exam' ? (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-amber-50 text-amber-700">
                              ລໍຖ້າເສັງ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-rose-50 text-rose-700">
                              ຍັງບໍ່ຄົບ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Floating/Sticky Action Bar for Mobile & Desktop */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                ກົດ "ບັນທຶກ ແລະ ໄປຄົນຕໍ່ໄປ" ເພື່ອບັນທຶກ ແລະ ເປີດນັກຮຽນຄົນຖັດໄປທັນທີ
              </div>
              <button
                onClick={() => handleSaveAllStudentScores(true)}
                disabled={isSaving}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>ບັນທຶກ ແລະ ໄປຄົນຕໍ່ໄປ (Save & Next)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
