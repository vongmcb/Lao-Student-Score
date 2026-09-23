import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Award,
  Filter,
  Download,
  Printer,
  ChevronDown,
  TrendingUp,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpDown,
  BookOpen
} from 'lucide-react';
import { Student, ClassRoom, Subject, ScorePeriod, ScoreRecord, SchoolYear } from '../types';
import {
  buildNestedScoresMap,
  calculateStudentSubjectScores,
  formatScore,
  StudentCalculatedSummary
} from '../services/calculations/scoreEngine';
import {
  calculateClassStudentRankings,
  calculateSubjectRankings,
  RankedStudentSummary
} from '../services/calculations/rankingEngine';
import { StudentDetailModal } from '../components/StudentDetailModal';
import { MissingScoresModal } from '../components/MissingScoresModal';

interface AllScoreViewProps {
  students: Student[];
  classes: ClassRoom[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scores: ScoreRecord[];
  schoolYears?: SchoolYear[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onSelectStudentForTracking?: (studentId: string) => void;
  onNavigateToScoreEntry?: (studentId: string, classId: string) => void;
}

export const AllScoreView: React.FC<AllScoreViewProps> = ({
  students,
  classes,
  subjects,
  periods,
  scores,
  schoolYears = [],
  selectedClassId,
  onSelectClass,
  onSelectStudentForTracking,
  onNavigateToScoreEntry
}) => {
  // View Scope: Annual vs Semester 1 vs Semester 2
  const [viewScope, setViewScope] = useState<'annual' | 'semester1' | 'semester2'>('annual');
  // Ranking Mode: class vs grade vs subject
  const [rankingMode, setRankingMode] = useState<'class' | 'grade' | 'subject'>('class');
  // Subject ranking selector
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  // Status filter: all vs complete vs incomplete
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'missing'>('all');
  // Grade filter
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  // Search query
  const [searchFilter, setSearchFilter] = useState('');
  // Show detailed subject columns toggle
  const [showSubjectColumns, setShowSubjectColumns] = useState(true);

  // Modals state
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [isMissingModalOpen, setIsMissingModalOpen] = useState(false);

  // Active Class
  const activeClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const activeSubjects = subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order);

  // Grades available
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    classes.forEach(c => {
      if (c.grade) set.add(c.grade);
    });
    return Array.from(set).sort();
  }, [classes]);

  // Nested scores lookup
  const nestedScores = useMemo(() => {
    return buildNestedScoresMap(scores);
  }, [scores]);

  // Compute calculated summaries for ALL students in system
  const allStudentSummaries = useMemo(() => {
    const list: StudentCalculatedSummary[] = [];
    for (const st of students) {
      const pMap = nestedScores[st.id] || {};
      const sum = calculateStudentSubjectScores(st.id, pMap, activeSubjects, periods, st);
      list.push(sum);
    }
    return list;
  }, [students, nestedScores, activeSubjects, periods]);

  // Map studentId -> calculated summary
  const summaryByStudentId = useMemo(() => {
    const map = new Map<string, StudentCalculatedSummary>();
    for (const s of allStudentSummaries) {
      map.set(s.studentId, s);
    }
    return map;
  }, [allStudentSummaries]);

  // Current target students based on rankingMode and filters:
  const currentClassStudents = useMemo(() => {
    if (rankingMode === 'grade') {
      const targetGrade = gradeFilter !== 'all' ? gradeFilter : (activeClass?.grade || '');
      const classIdsInGrade = new Set(classes.filter(c => c.grade === targetGrade).map(c => c.id));
      return students.filter(s => classIdsInGrade.has(s.classId));
    }
    // Class mode or default
    return students.filter(s => s.classId === activeClass?.id);
  }, [students, rankingMode, gradeFilter, activeClass, classes]);

  // Class student summaries with Competition Ranks
  const rankedClassSummaries = useMemo(() => {
    const targetSums = currentClassStudents.map(st => summaryByStudentId.get(st.id)!).filter(Boolean);
    return calculateClassStudentRankings(targetSums);
  }, [currentClassStudents, summaryByStudentId]);

  // Subject Ranking List
  const subjectRankingList = useMemo(() => {
    const targetSums = currentClassStudents.map(st => summaryByStudentId.get(st.id)!).filter(Boolean);
    return calculateSubjectRankings(
      targetSums,
      selectedSubjectId,
      viewScope,
      activeClass?.name || '',
      activeClass?.grade || ''
    );
  }, [currentClassStudents, summaryByStudentId, selectedSubjectId, viewScope, activeClass]);

  // Filtered list for primary table
  const displayedSummaries = useMemo(() => {
    let list = [...rankedClassSummaries];

    // Status filter
    if (statusFilter === 'complete') {
      if (viewScope === 'semester1') list = list.filter(s => s.isSemester1Complete);
      else if (viewScope === 'semester2') list = list.filter(s => s.isSemester2Complete);
      else list = list.filter(s => s.isAnnualComplete);
    } else if (statusFilter === 'missing') {
      if (viewScope === 'semester1') list = list.filter(s => !s.isSemester1Complete);
      else if (viewScope === 'semester2') list = list.filter(s => !s.isSemester2Complete);
      else list = list.filter(s => !s.isAnnualComplete);
    }

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(s => {
        const name = `${s.student?.title || ''} ${s.student?.firstName || ''} ${s.student?.lastName || ''}`.toLowerCase();
        const code = (s.student?.studentId || '').toLowerCase();
        const roll = String(s.student?.rollNumber || '');
        return name.includes(q) || code.includes(q) || roll.includes(q);
      });
    }

    // Sort by rank ascending (ranked first), then roll number
    return list.sort((a, b) => {
      let rankA = viewScope === 'semester1' ? a.rankSem1 : viewScope === 'semester2' ? a.rankSem2 : a.rankAnnual;
      let rankB = viewScope === 'semester1' ? b.rankSem1 : viewScope === 'semester2' ? b.rankSem2 : b.rankAnnual;

      if (rankA !== null && rankB !== null) return rankA - rankB;
      if (rankA !== null) return -1;
      if (rankB !== null) return 1;
      return (a.student?.rollNumber || 0) - (b.student?.rollNumber || 0);
    });
  }, [rankedClassSummaries, statusFilter, viewScope, searchFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    let header = 'ເລກທີ,ລະຫັດນັກຮຽນ,ຊື່-ນາມສະກຸນ,ຫ້ອງ,';
    if (showSubjectColumns) {
      activeSubjects.forEach(sub => {
        header += `"${sub.name}",`;
      });
    }
    header += 'ຄະແນນລວມ,ຄະແນນສະເລ່ຍ,ອັນດັບທີ,ສະຖານະ\n';

    const rows = displayedSummaries.map(sum => {
      const st = sum.student;
      const c = classes.find(cls => cls.id === st?.classId);
      let row = `${st?.rollNumber || ''},"${st?.studentId || ''}","${st?.title || ''} ${st?.firstName || ''} ${st?.lastName || ''}","${c?.name || ''}",`;

      if (showSubjectColumns) {
        activeSubjects.forEach(sub => {
          const res = sum.subjectResults[sub.id];
          let val = '';
          if (viewScope === 'annual') {
            val = res?.isAnnualComplete && res.annualScore !== null ? formatScore(res.annualScore, 2) : '';
          } else if (viewScope === 'semester1') {
            val = res?.semester1.isComplete && res.semester1.semesterScore !== null ? formatScore(res.semester1.semesterScore, 2) : '';
          } else {
            val = res?.semester2.isComplete && res.semester2.semesterScore !== null ? formatScore(res.semester2.semesterScore, 2) : '';
          }
          row += `"${val}",`;
        });
      }

      let total = '';
      let avg = '';
      let rank = '—';
      let status = '';

      if (viewScope === 'annual') {
        total = sum.totalAnnual !== null ? formatScore(sum.totalAnnual, 2) : '';
        avg = sum.avgAnnual !== null ? formatScore(sum.avgAnnual, 2) : '';
        rank = sum.rankAnnual ? String(sum.rankAnnual) : '—';
        status = sum.statusAnnualLabel;
      } else if (viewScope === 'semester1') {
        total = sum.totalSemester1 !== null ? formatScore(sum.totalSemester1, 2) : '';
        avg = sum.avgSemester1 !== null ? formatScore(sum.avgSemester1, 2) : '';
        rank = sum.rankSem1 ? String(sum.rankSem1) : '—';
        status = sum.statusSem1Label;
      } else {
        total = sum.totalSemester2 !== null ? formatScore(sum.totalSemester2, 2) : '';
        avg = sum.avgSemester2 !== null ? formatScore(sum.avgSemester2, 2) : '';
        rank = sum.rankSem2 ? String(sum.rankSem2) : '—';
        status = sum.statusSem2Label;
      }

      row += `"${total}","${avg}","${rank}","${status}"`;
      return row;
    }).join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scores_${activeClass?.name || 'class'}_${viewScope}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  // Missing students count for this class
  const classMissingCount = rankedClassSummaries.filter(s => s.missingItems.length > 0).length;

  return (
    <div className="space-y-6 font-lao">
      {/* Top Filter and Controls Header */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4 no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> ຕາຕະລາງລວມຄະແນນ (All Score)
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              ສະຫຼຸບຄະແນນ ແລະ ຈັດອັນດັບນັກຮຽນ
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              ຄຳນວນຄະແນນສະເລ່ຍ, ຄະແນນລວມ, ສະຖານະ ແລະ ອັນດັບການແຂ່ງຂັນ (1, 2, 2, 4)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsMissingModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>ຄະແນນທີ່ຍັງຂາດ ({classMissingCount})</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>ພິມລາຍງານ</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-slate-100">
          {/* Class Select */}
          <div>
            <label className="text-2xs font-bold text-slate-600 uppercase block mb-1">ຫ້ອງຮຽນ:</label>
            <select
              value={selectedClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  ຫ້ອງ {c.name} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Scope Select (Semester 1 / 2 / Annual) */}
          <div>
            <label className="text-2xs font-bold text-slate-600 uppercase block mb-1">ໄລຍະເວລາ:</label>
            <select
              value={viewScope}
              onChange={(e) => setViewScope(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="annual">ສະເລ່ຍໝົດປີ (Annual)</option>
              <option value="semester1">ພາກຮຽນທີ I (Semester 1)</option>
              <option value="semester2">ພາກຮຽນທີ II (Semester 2)</option>
            </select>
          </div>

          {/* Ranking Mode */}
          <div>
            <label className="text-2xs font-bold text-slate-600 uppercase block mb-1">ຮູບແບບຈັດອັນດັບ:</label>
            <select
              value={rankingMode}
              onChange={(e) => setRankingMode(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="class">ອັນດັບທັງຫ້ອງ (Class)</option>
              <option value="grade">ອັນດັບທັງຊັ້ນ (Grade)</option>
              <option value="subject">ອັນດັບຕາມວິຊາ (Subject)</option>
            </select>
          </div>

          {/* Grade Filter (when rankingMode === 'grade') */}
          {rankingMode === 'grade' && (
            <div>
              <label className="text-2xs font-bold text-slate-600 uppercase block mb-1">ເລືອກຊັ້ນຮຽນ:</label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">ທຸກຊັ້ນຮຽນ</option>
                {availableGrades.map(g => (
                  <option key={g} value={g}>ຊັ້ນ {g}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subject Filter (when rankingMode === 'subject') */}
          {rankingMode === 'subject' && (
            <div>
              <label className="text-2xs font-bold text-slate-600 uppercase block mb-1">ເລືອກວິຊາ:</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {activeSubjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="text-2xs font-bold text-slate-600 uppercase block mb-1">ສະຖານະ:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="all">ທັງໝົດ</option>
              <option value="complete">ຄົບແລ້ວ</option>
              <option value="missing">ຍັງຂາດຄະແນນ</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="col-span-2 sm:col-span-2">
            <label className="text-2xs font-bold text-slate-600 uppercase block mb-1">ຄົ້ນຫານັກຮຽນ:</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="ຄົ້ນຫາຊື່, ເລກທີ, ລະຫັດ..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* View Options Toggle */}
        <div className="flex items-center justify-between pt-2 text-xs text-slate-500 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showSubjectColumns}
                onChange={(e) => setShowSubjectColumns(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>ສະແດງຖັນລາຍວິຊາທັງໝົດ ({activeSubjects.length} ວິຊາ)</span>
            </label>
          </div>
          <div>
            ສະແດງ {displayedSummaries.length} / {currentClassStudents.length} ຄົນ
          </div>
        </div>
      </div>

      {/* SUBJECT RANKING VIEW SPECIAL TAB */}
      {rankingMode === 'subject' ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">
                ຕາຕະລາງຈັດອັນດັບສະເພາະວິຊາ: {activeSubjects.find(s => s.id === selectedSubjectId)?.name} (
                {viewScope === 'annual' ? 'ໝົດປີ' : viewScope === 'semester1' ? 'ພາກຮຽນ I' : 'ພາກຮຽນ II'})
              </h3>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 text-center font-bold">
                <tr>
                  <th className="px-3 py-3 w-16 text-center">ອັນດັບ</th>
                  <th className="px-3 py-3 w-16 text-center">ເລກທີ</th>
                  <th className="px-4 py-3 text-left">ຊື່ ແລະ ນາມສະກຸນ</th>
                  <th className="px-3 py-3 text-center">ຄະແນນ</th>
                  <th className="px-3 py-3 text-center">ສະຖານະ</th>
                  <th className="px-3 py-3 text-center w-24">ຈັດການ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subjectRankingList.map((item, idx) => {
                  const student = students.find(s => s.id === item.studentId);
                  return (
                    <tr key={item.studentId} className="hover:bg-blue-50/40 transition">
                      <td className="px-3 py-2.5 text-center font-bold">
                        {item.rank ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                              item.rank === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : item.rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : item.rank === 3
                                ? 'bg-amber-700/20 text-amber-900'
                                : 'text-slate-600'
                            }`}
                          >
                            {item.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-medium">
                        {item.rollNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {item.studentName}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-bold text-sm text-blue-700">
                        {formatScore(item.score, 2)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-2xs font-medium ${
                            item.isComplete
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {item.statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => {
                            if (student) setSelectedStudentForDetail(student);
                          }}
                          className="px-2.5 py-1 text-2xs font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white rounded-lg transition"
                        >
                          ເບິ່ງລາຍລະອຽດ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* MAIN ALL SCORE COMPREHENSIVE TABLE */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-bold text-center">
                  <th className="px-2 py-3 w-10 border-r border-slate-800">ລ/ດ</th>
                  <th className="px-2 py-3 w-12 border-r border-slate-800">ເລກທີ</th>
                  <th className="px-4 py-3 text-left min-w-[170px] sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                    ຊື່-ນາມສະກຸນ
                  </th>
                  <th className="px-2 py-3 w-16 border-r border-slate-800">ວິຊາ</th>

                  {/* Dynamic Subject Columns */}
                  {showSubjectColumns &&
                    activeSubjects.map(sub => (
                      <th
                        key={sub.id}
                        className="px-2 py-3 min-w-[62px] border-r border-slate-800 text-2xs truncate max-w-[90px]"
                        title={sub.name}
                      >
                        {sub.code || sub.name}
                      </th>
                    ))}

                  <th className="px-3 py-3 min-w-[75px] bg-slate-800 border-r border-slate-700">
                    ຄະແນນລວມ
                  </th>
                  <th className="px-3 py-3 min-w-[70px] bg-blue-700 border-r border-blue-600">
                    ສະເລ່ຍ
                  </th>
                  <th className="px-2 py-3 min-w-[55px] bg-amber-600 text-white border-r border-amber-500">
                    ອັນດັບ
                  </th>
                  <th className="px-3 py-3 min-w-[90px] bg-slate-800">ສະຖານະ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {displayedSummaries.map((sum, index) => {
                  const st = sum.student;
                  if (!st) return null;

                  // Determine active values according to viewScope
                  let totalVal: number | null = null;
                  let avgVal: number | null = null;
                  let rankVal: number | null = null;
                  let statusLabel = '';
                  let isComplete = false;

                  if (viewScope === 'annual') {
                    totalVal = sum.totalAnnual;
                    avgVal = sum.avgAnnual;
                    rankVal = sum.rankAnnual ?? null;
                    statusLabel = sum.statusAnnualLabel;
                    isComplete = sum.isAnnualComplete;
                  } else if (viewScope === 'semester1') {
                    totalVal = sum.totalSemester1;
                    avgVal = sum.avgSemester1;
                    rankVal = sum.rankSem1 ?? null;
                    statusLabel = sum.statusSem1Label;
                    isComplete = sum.isSemester1Complete;
                  } else {
                    totalVal = sum.totalSemester2;
                    avgVal = sum.avgSemester2;
                    rankVal = sum.rankSem2 ?? null;
                    statusLabel = sum.statusSem2Label;
                    isComplete = sum.isSemester2Complete;
                  }

                  const isEven = index % 2 === 0;

                  return (
                    <tr
                      key={st.id}
                      onClick={() => setSelectedStudentForDetail(st)}
                      className={`cursor-pointer transition ${
                        isEven ? 'bg-white' : 'bg-slate-50/50'
                      } hover:bg-blue-50/40`}
                    >
                      <td className="px-2 py-2.5 text-center text-slate-400 text-2xs border-r border-slate-100 font-mono">
                        {index + 1}
                      </td>
                      <td className="px-2 py-2.5 text-center font-bold text-slate-800 border-r border-slate-100 font-mono">
                        {st.rollNumber}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 border-r border-slate-100 sticky left-0 bg-inherit z-10 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold">
                            {st.title} {st.firstName} {st.lastName}
                          </span>
                          <span className="text-2xs text-slate-400 font-mono">({st.studentId})</span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center text-slate-500 border-r border-slate-100 text-2xs">
                        {viewScope === 'annual'
                          ? sum.validSubjectCountAnnual
                          : viewScope === 'semester1'
                          ? sum.validSubjectCountSem1
                          : sum.validSubjectCountSem2}{' '}
                        / {activeSubjects.length}
                      </td>

                      {/* Subject Scores */}
                      {showSubjectColumns &&
                        activeSubjects.map(sub => {
                          const res = sum.subjectResults[sub.id];
                          let score: number | null = null;
                          if (viewScope === 'annual') {
                            score = res?.isAnnualComplete ? res.annualScore : null;
                          } else if (viewScope === 'semester1') {
                            score = res?.semester1.isComplete ? res.semester1.semesterScore : null;
                          } else {
                            score = res?.semester2.isComplete ? res.semester2.semesterScore : null;
                          }

                          return (
                            <td
                              key={sub.id}
                              className={`px-2 py-2.5 text-center font-mono border-r border-slate-100 ${
                                score !== null
                                  ? 'text-slate-800 font-medium'
                                  : 'text-slate-300 text-2xs'
                              }`}
                            >
                              {formatScore(score, 1, '—')}
                            </td>
                          );
                        })}

                      {/* Total */}
                      <td className="px-3 py-2.5 text-center font-bold font-mono text-slate-900 border-r border-slate-100 bg-slate-50/70">
                        {totalVal !== null ? formatScore(totalVal, 2) : '—'}
                      </td>

                      {/* Average */}
                      <td className="px-3 py-2.5 text-center font-bold font-mono text-blue-700 border-r border-slate-100 bg-blue-50/40 text-sm">
                        {avgVal !== null ? formatScore(avgVal, 2) : '—'}
                      </td>

                      {/* Rank */}
                      <td className="px-2 py-2.5 text-center border-r border-slate-100 font-bold">
                        {rankVal ? (
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              rankVal === 1
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : rankVal === 2
                                ? 'bg-slate-200 text-slate-800'
                                : rankVal === 3
                                ? 'bg-amber-700/20 text-amber-900'
                                : 'text-slate-700'
                            }`}
                          >
                            {rankVal}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                            isComplete
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : statusLabel === 'ລໍຖ້າຄະແນນເສັງ'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isComplete ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : statusLabel === 'ລໍຖ້າຄະແນນເສັງ' ? (
                            <Clock className="w-3 h-3 text-amber-600" />
                          ) : (
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                          )}
                          <span>{statusLabel}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
        summaries={rankedClassSummaries}
        onSelectStudentToEdit={(stId, clsId) => {
          if (onNavigateToScoreEntry) {
            onNavigateToScoreEntry(stId, clsId);
          }
        }}
      />
    </div>
  );
};
