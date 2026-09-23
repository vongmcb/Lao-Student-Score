import React, { useMemo, useState } from 'react';
import {
  Users,
  DoorOpen,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Award,
  Clock,
  BarChart2,
  PieChart
} from 'lucide-react';
import { Student, ClassRoom, Subject, ScoreRecord, ScorePeriod } from '../types';
import {
  buildNestedScoresMap,
  calculateStudentSubjectScores,
  formatScore,
  StudentCalculatedSummary
} from '../services/calculations/scoreEngine';
import { calculateClassStudentRankings } from '../services/calculations/rankingEngine';
import { MissingScoresModal } from '../components/MissingScoresModal';
import { StudentDetailModal } from '../components/StudentDetailModal';

interface DashboardProps {
  students: Student[];
  classes: ClassRoom[];
  subjects: Subject[];
  scores: ScoreRecord[];
  periods: ScorePeriod[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onNavigate: (tab: string) => void;
  onNavigateToScoreEntry?: (studentId: string, classId: string) => void;
}

export const DashboardView: React.FC<DashboardProps> = ({
  students,
  classes,
  subjects,
  scores,
  periods,
  selectedClassId,
  onSelectClass,
  onNavigate,
  onNavigateToScoreEntry
}) => {
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);

  const activeSubjects = useMemo(() => subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order), [subjects]);

  // Filter students based on selected class or all
  const filteredStudents = useMemo(() => {
    return selectedClassId === 'all'
      ? students
      : students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Nested lookup map
  const nestedScores = useMemo(() => {
    return buildNestedScoresMap(scores);
  }, [scores]);

  // Calculate student summaries
  const studentSummaries = useMemo(() => {
    return filteredStudents.map(st => {
      const pMap = nestedScores[st.id] || {};
      return calculateStudentSubjectScores(st.id, pMap, activeSubjects, periods, st);
    });
  }, [filteredStudents, nestedScores, activeSubjects, periods]);

  // Map studentId -> summary
  const summaryByStudentId = useMemo(() => {
    const map = new Map<string, StudentCalculatedSummary>();
    studentSummaries.forEach(s => map.set(s.studentId, s));
    return map;
  }, [studentSummaries]);

  // Ranked summaries
  const rankedSummaries = useMemo(() => {
    return calculateClassStudentRankings(studentSummaries);
  }, [studentSummaries]);

  // Status breakdown
  const completeCount = studentSummaries.filter(s => s.isAnnualComplete).length;
  const awaitingExamCount = studentSummaries.filter(s => !s.isAnnualComplete && (s.statusSem1 === 'awaiting_exam' || s.statusSem2 === 'awaiting_exam')).length;
  const incompleteCount = studentSummaries.filter(s => s.missingItems.length > 0).length;

  // Grade distributions (Annual or Semester 1 if annual not ready)
  const scoreDistribution = useMemo(() => {
    let excellent = 0; // >= 8.5
    let good = 0;      // 7.0 - 8.4
    let medium = 0;    // 5.0 - 6.9
    let weak = 0;      // < 5.0

    studentSummaries.forEach(s => {
      const targetScore = s.avgAnnual ?? s.avgSemester1;
      if (targetScore !== null) {
        if (targetScore >= 8.5) excellent++;
        else if (targetScore >= 7.0) good++;
        else if (targetScore >= 5.0) medium++;
        else weak++;
      }
    });

    return { excellent, good, medium, weak };
  }, [studentSummaries]);

  // Top 5 students
  const topStudents = useMemo(() => {
    return [...rankedSummaries]
      .sort((a, b) => {
        const scoreA = a.avgAnnual ?? a.avgSemester1 ?? 0;
        const scoreB = b.avgAnnual ?? b.avgSemester1 ?? 0;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }, [rankedSummaries]);

  // Overall average
  const validAvgs = studentSummaries.map(s => s.avgAnnual ?? s.avgSemester1).filter((v): v is number => v !== null);
  const overallClassAvg = validAvgs.length > 0
    ? (validAvgs.reduce((a, b) => a + b, 0) / validAvgs.length).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6 font-lao">
      {/* Top Banner / Filter Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" /> ພາບລວມລະບົບຄະແນນ
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard ສະຫຼຸບຄະແນນ ແລະ ສະຖິຕິ
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            ຕິດຕາມຄວາມຄືບໜ້າການປ້ອນຄະແນນ, ສະຖານະການຄຳນວນ ແລະ ການຈັດອັນດັບ
          </p>
        </div>

        {/* Class selector */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <label className="text-2xs font-bold text-slate-600 uppercase whitespace-nowrap">
            ເລືອກຫ້ອງ:
          </label>
          <select
            id="dashboard-class-select"
            value={selectedClassId}
            onChange={(e) => onSelectClass(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3.5 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          >
            <option value="all">ທຸກຫ້ອງຮຽນ ({classes.length} ຫ້ອງ)</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>
                ຫ້ອງ {c.name} ({c.grade})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-2xs font-bold text-slate-500 uppercase">ນັກຮຽນທັງໝົດ</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-mono">
              {filteredStudents.length}
            </div>
            <span className="text-2xs text-slate-400 mt-0.5 block">
              {classes.length} ຫ້ອງຮຽນ • {activeSubjects.length} ວິຊາ
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Complete Scores */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-2xs font-bold text-slate-500 uppercase">ຄະແນນຄົບຖ້ວນ</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 mt-1 font-mono">
              {completeCount}
            </div>
            <span className="text-2xs text-emerald-700 mt-0.5 block">
              {filteredStudents.length > 0 ? ((completeCount / filteredStudents.length) * 100).toFixed(0) : 0}% ຂອງນັກຮຽນ
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Incomplete Scores */}
        <div
          onClick={() => setIsMissingModalOpen(true)}
          className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs flex items-center justify-between cursor-pointer hover:border-amber-400 transition"
        >
          <div>
            <span className="text-2xs font-bold text-amber-800 uppercase flex items-center gap-1">
              <span>ຍັງຂາດຄະແນນ</span>
              <span className="underline text-amber-600 font-normal">ເບິ່ງລາຍການ</span>
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 mt-1 font-mono">
              {incompleteCount}
            </div>
            <span className="text-2xs text-amber-700 mt-0.5 block">
              {awaitingExamCount} ຄົນລໍຖ້າຄະແນນເສັງ
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-2xs font-bold text-slate-500 uppercase">ຄະແນນສະເລ່ຍລວມ</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 mt-1 font-mono">
              {overallClassAvg}
            </div>
            <span className="text-2xs text-slate-400 mt-0.5 block">
              ຄິດໄລ່ຈາກ {validAvgs.length} ຄົນ
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Score Distribution & Top 5 Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Distribution Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900 text-sm">
                ລະດັບຜົນການຮຽນ (Score Levels)
              </h3>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {/* ດີເລີດ >= 8.5 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-emerald-700">ດີເລີດ (8.5 - 10.0)</span>
                <span className="font-mono text-slate-700">{scoreDistribution.excellent} ຄົນ</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${filteredStudents.length > 0 ? (scoreDistribution.excellent / filteredStudents.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* ເກັ່ງ 7.0 - 8.4 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-blue-700">ເກັ່ງ (7.0 - 8.4)</span>
                <span className="font-mono text-slate-700">{scoreDistribution.good} ຄົນ</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${filteredStudents.length > 0 ? (scoreDistribution.good / filteredStudents.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* ປານກາງ 5.0 - 6.9 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-amber-700">ປານກາງ (5.0 - 6.9)</span>
                <span className="font-mono text-slate-700">{scoreDistribution.medium} ຄົນ</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${filteredStudents.length > 0 ? (scoreDistribution.medium / filteredStudents.length) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* ອ່ອນ / ປັບປຸງ < 5.0 */}
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-rose-700">ອ່ອນ / ຕ້ອງປັບປຸງ (&lt; 5.0)</span>
                <span className="font-mono text-slate-700">{scoreDistribution.weak} ຄົນ</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${filteredStudents.length > 0 ? (scoreDistribution.weak / filteredStudents.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
            <span>ຈັດແບ່ງຕາມເກນກະຊວງສຶກສາທິການ</span>
            <button
              onClick={() => onNavigate('all-score')}
              className="text-blue-600 hover:underline font-semibold"
            >
              ເບິ່ງລາຍລະອຽດທັງໝົດ →
            </button>
          </div>
        </div>

        {/* Top 5 Students Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-slate-900 text-sm">
                  ນັກຮຽນດີເດັ່ນ 5 ອັນດັບຕົ້ນ (Top 5 Ranked)
                </h3>
              </div>
              <button
                onClick={() => onNavigate('all-score')}
                className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
              >
                <span>ຕາຕະລາງລວມ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {topStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  ຍັງບໍ່ມີຂໍ້ມູນຄະແນນສຳລັບຈັດອັນດັບ
                </div>
              ) : (
                topStudents.map((sum, idx) => {
                  const st = sum.student;
                  if (!st) return null;
                  const rank = sum.rankAnnual ?? sum.rankSem1 ?? (idx + 1);
                  const avg = sum.avgAnnual ?? sum.avgSemester1;

                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStudentForDetail(st)}
                      className="py-2.5 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                            rank === 1
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : rank === 3
                              ? 'bg-amber-700/20 text-amber-900'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {rank}
                        </span>
                        <div>
                          <div className="font-bold text-slate-800 text-xs">
                            {st.title} {st.firstName} {st.lastName}
                          </div>
                          <div className="text-2xs text-slate-400">
                            ເລກທີ #{st.rollNumber} • ລະຫັດ: {st.studentId} • ຫ້ອງ: {classes.find(c => c.id === st.classId)?.name}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-blue-700 text-sm">
                          {avg !== null ? formatScore(avg, 2) : '—'}
                        </div>
                        <div className="text-2xs text-slate-400">
                          {sum.isAnnualComplete ? 'ຄະແນນໝົດປີ' : 'ຄະແນນພາກ I'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('score-entry')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <span>ປ້ອນຄະແນນຕໍ່</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsMissingModalOpen(true)}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>ກວດສອບຄະແນນທີ່ຍັງຂາດ ({incompleteCount} ຄົນ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudentForDetail && (
        <StudentDetailModal
          isOpen={!!selectedStudentForDetail}
          onClose={() => setSelectedStudentForDetail(null)}
          student={selectedStudentForDetail}
          classroom={classes.find(c => c.id === selectedStudentForDetail.classId)}
          summary={summaryByStudentId.get(selectedStudentForDetail.id)}
          subjects={activeSubjects}
          periods={periods}
          onNavigateToEditScore={(stId, clsId) => {
            if (onNavigateToScoreEntry) {
              onNavigateToScoreEntry(stId, clsId);
            }
          }}
        />
      )}

      {/* Missing Scores Modal */}
      <MissingScoresModal
        isOpen={isMissingModalOpen}
        onClose={() => setIsMissingModalOpen(false)}
        students={students}
        classes={classes}
        summaries={studentSummaries}
        onSelectStudentToEdit={(stId, clsId) => {
          if (onNavigateToScoreEntry) {
            onNavigateToScoreEntry(stId, clsId);
          }
        }}
      />
    </div>
  );
};
