import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Users,
  BookOpen,
  Award,
  Layers,
  History,
  CheckCircle,
  Eye,
  Loader2,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import {
  Student,
  ClassRoom,
  Subject,
  ScorePeriod,
  ScoreRecord,
  School,
  SchoolYear,
  AttendanceRecord,
  BehaviorRecord,
  ReportCategory,
  ReportHistoryRecord
} from '../types';
import { PDFClassMonthlyReport } from '../components/pdf/PDFClassMonthlyReport';
import { PDFClassSemesterReport } from '../components/pdf/PDFClassSemesterReport';
import { PDFClassAnnualReport } from '../components/pdf/PDFClassAnnualReport';
import { PDFSubjectReport } from '../components/pdf/PDFSubjectReport';
import { PDFIndividualScoreReport } from '../components/pdf/PDFIndividualScoreReport';
import { PDFTrackingBookReport } from '../components/pdf/PDFTrackingBookReport';
import { PDFClassBatchReport } from '../components/pdf/PDFClassBatchReport';
import { PDFPreviewModal } from '../components/pdf/PDFPreviewModal';
import {
  buildPdfFileName,
  downloadPdfFromElement
} from '../services/pdf/pdfGenerator';
import {
  saveReportHistory,
  getReportHistory,
  getAttendanceForStudent,
  getBehaviorForStudent
} from '../services/dataService';

interface ReportsViewProps {
  students: Student[];
  classes: ClassRoom[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scores: ScoreRecord[];
  school: School | null;
  schoolYears: SchoolYear[];
  currentUserEmail?: string;
  onNavigateToStudentTracking?: (studentId: string) => void;
  onNavigateToAllScore?: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  students,
  classes,
  subjects,
  periods,
  scores,
  school,
  schoolYears,
  currentUserEmail = 'teacher@laostudentscore.edu.la'
}) => {
  // Main Navigation / Mode
  const [activeReportCategory, setActiveReportCategory] = useState<ReportCategory>('class_monthly');
  const [showHistory, setShowHistory] = useState(false);

  // Selected filters
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [selectedPeriodCode, setSelectedPeriodCode] = useState<string>('09');
  const [subjectReportMode, setSubjectReportMode] = useState<'single_period' | 'annual_summary'>('single_period');
  const [batchType, setBatchType] = useState<'individual' | 'tracking_book'>('individual');

  // Preview & Export Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGeneratingDirectDownload, setIsGeneratingDirectDownload] = useState(false);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);

  // Batch Export progress
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Report History from Firestore
  const [reportHistory, setReportHistory] = useState<ReportHistoryRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Attendance & Behavior for individual reports
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [behaviorRecords, setBehaviorRecords] = useState<BehaviorRecord[]>([]);

  // Hidden printable container ref for direct download
  const directPrintRef = useRef<HTMLDivElement>(null);
  const batchPrintRef = useRef<HTMLDivElement>(null);

  // Load history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const records = await getReportHistory(25);
      setReportHistory(records);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Filter students in current class
  const classStudents = useMemo(() => {
    if (!selectedClassId) return students;
    return students.filter(s => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Update selected student when class changes
  useEffect(() => {
    if (classStudents.length > 0 && !classStudents.some(s => s.id === selectedStudentId)) {
      setSelectedStudentId(classStudents[0].id);
    }
  }, [classStudents, selectedStudentId]);

  // Current selected objects
  const currentClass = useMemo(() => classes.find(c => c.id === selectedClassId) || null, [classes, selectedClassId]);
  const currentStudent = useMemo(() => students.find(s => s.id === selectedStudentId) || classStudents[0] || null, [students, selectedStudentId, classStudents]);
  const currentSubject = useMemo(() => subjects.find(s => s.id === selectedSubjectId) || subjects[0] || null, [subjects, selectedSubjectId]);
  const currentYear = useMemo(() => schoolYears.find(y => y.id === currentClass?.schoolYearId) || schoolYears[0] || null, [schoolYears, currentClass]);
  const currentPeriod = useMemo(() => periods.find(p => p.code === selectedPeriodCode) || periods[0], [periods, selectedPeriodCode]);

  // Load attendance & behavior when student changes
  useEffect(() => {
    if (!currentStudent || !currentYear) return;
    const fetchStudentExtras = async () => {
      try {
        const [att, beh] = await Promise.all([
          getAttendanceForStudent(currentStudent.id, currentYear.id),
          getBehaviorForStudent(currentStudent.id, currentYear.id)
        ]);
        setAttendanceRecords(att);
        setBehaviorRecords(beh);
      } catch (err) {
        console.error('Error fetching student extras:', err);
      }
    };
    fetchStudentExtras();
  }, [currentStudent?.id, currentYear?.id]);

  // Nested scores lookup: studentId -> subjectId -> periodCode -> score
  const scoresMap = useMemo(() => {
    const map: Record<string, Record<string, Record<string, number | null>>> = {};
    for (const sc of scores) {
      if (!map[sc.studentId]) map[sc.studentId] = {};
      if (!map[sc.studentId][sc.subjectId]) map[sc.studentId][sc.subjectId] = {};
      map[sc.studentId][sc.subjectId][sc.periodId] = sc.score;
    }
    return map;
  }, [scores]);

  // Compute file name according to user specification (Requirement 21)
  const currentFileName = useMemo(() => {
    return buildPdfFileName({
      reportType: activeReportCategory,
      grade: currentClass?.grade,
      room: currentClass?.name,
      periodCode:
        activeReportCategory === 'class_monthly'
          ? currentPeriod?.code
          : activeReportCategory === 'subject'
          ? selectedPeriodCode
          : undefined,
      subjectCode: currentSubject?.code || currentSubject?.name,
      studentId: currentStudent?.studentId,
      rollNumber: currentStudent?.rollNumber,
      schoolYear: currentYear?.name
    });
  }, [
    activeReportCategory,
    currentClass,
    currentPeriod,
    selectedPeriodCode,
    currentSubject,
    currentStudent,
    currentYear
  ]);

  // Report title and orientation
  const reportInfo = useMemo(() => {
    switch (activeReportCategory) {
      case 'class_monthly':
        return {
          title: `ລາຍງານຄະແນນປະຈຳ ${currentPeriod?.name || 'ເດືອນ'} (ຫ້ອງ ${currentClass?.grade || ''} ${currentClass?.name || ''})`,
          orientation: 'landscape' as const
        };
      case 'class_sem1':
        return {
          title: `ສະຫຼຸບຄະແນນພາກຮຽນທີ I (ຫ້ອງ ${currentClass?.grade || ''} ${currentClass?.name || ''})`,
          orientation: 'landscape' as const
        };
      case 'class_sem2':
        return {
          title: `ສະຫຼຸບຄະແນນພາກຮຽນທີ II (ຫ້ອງ ${currentClass?.grade || ''} ${currentClass?.name || ''})`,
          orientation: 'landscape' as const
        };
      case 'class_annual':
        return {
          title: `ສະຫຼຸບຄະແນນສິ້ນສົກຮຽນ (ຫ້ອງ ${currentClass?.grade || ''} ${currentClass?.name || ''})`,
          orientation: 'landscape' as const
        };
      case 'subject':
        return {
          title: `ລາຍງານຄະແນນວິຊາ ${currentSubject?.name || ''} (ຫ້ອງ ${currentClass?.grade || ''} ${currentClass?.name || ''})`,
          orientation: 'landscape' as const
        };
      case 'individual':
        return {
          title: `ໃບຄະແນນນັກຮຽນ: ${currentStudent?.title || ''} ${currentStudent?.firstName || ''} ${currentStudent?.lastName || ''}`,
          orientation: 'portrait' as const
        };
      case 'tracking_book':
        return {
          title: `ປຶ້ມຕິດຕາມນັກຮຽນ: ${currentStudent?.title || ''} ${currentStudent?.firstName || ''} ${currentStudent?.lastName || ''}`,
          orientation: 'landscape' as const
        };
      default:
        return {
          title: 'ລາຍງານຄະແນນ',
          orientation: 'landscape' as const
        };
    }
  }, [activeReportCategory, currentPeriod, currentClass, currentSubject, currentStudent]);

  // Direct Download PDF Handler
  const handleDirectDownload = async () => {
    if (!directPrintRef.current) return;
    setIsGeneratingDirectDownload(true);

    try {
      await downloadPdfFromElement(directPrintRef.current, {
        orientation: reportInfo.orientation,
        fileName: currentFileName,
        title: reportInfo.title
      });

      // Save to Firestore History (Requirement 23)
      await saveReportHistory({
        reportType: activeReportCategory,
        reportTitle: reportInfo.title,
        schoolYearId: currentYear?.id || '',
        schoolYearName: currentYear?.name,
        classId: currentClass?.id || '',
        className: `${currentClass?.grade || ''} ${currentClass?.name || ''}`,
        studentId: currentStudent?.id,
        studentName: currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : undefined,
        subjectId: currentSubject?.id,
        subjectName: currentSubject?.name,
        periodId: currentPeriod?.id,
        periodName: currentPeriod?.name,
        fileName: currentFileName,
        generatedBy: currentUserEmail,
        generatedAt: new Date().toISOString()
      });

      loadHistory();
      setDownloadSuccessToast(currentFileName);
      setTimeout(() => setDownloadSuccessToast(null), 4500);
    } catch (err) {
      console.error('Error generating direct PDF:', err);
    } finally {
      setIsGeneratingDirectDownload(false);
    }
  };

  // Direct Print Handler
  const handleDirectPrint = () => {
    window.print();
  };

  // Batch Export Handler (Requirement 11)
  const handleBatchExport = async () => {
    if (!batchPrintRef.current || classStudents.length === 0) return;
    setIsBatchExporting(true);
    setBatchProgress({ current: 1, total: classStudents.length });

    const batchFileName = `Class_${currentClass?.grade || 'Grade'}_${currentClass?.name || 'Room'}_All_${batchType === 'individual' ? 'ScoreSheets' : 'TrackingBooks'}_${currentYear?.name || 'Year'}.pdf`;

    try {
      await downloadPdfFromElement(batchPrintRef.current, {
        orientation: batchType === 'individual' ? 'portrait' : 'landscape',
        fileName: batchFileName,
        title: `ຊຸດລາຍງານນັກຮຽນທັງໝົດໃນຫ້ອງ (${classStudents.length} ຄົນ)`
      });

      await saveReportHistory({
        reportType: batchType === 'individual' ? 'individual' : 'tracking_book',
        reportTitle: `Batch Export: ຫ້ອງ ${currentClass?.grade} ${currentClass?.name} (${classStudents.length} ຄົນ)`,
        schoolYearId: currentYear?.id || '',
        schoolYearName: currentYear?.name,
        classId: currentClass?.id || '',
        className: `${currentClass?.grade || ''} ${currentClass?.name || ''}`,
        fileName: batchFileName,
        generatedBy: currentUserEmail,
        generatedAt: new Date().toISOString()
      });

      loadHistory();
      setDownloadSuccessToast(batchFileName);
      setTimeout(() => setDownloadSuccessToast(null), 4500);
    } catch (err) {
      console.error('Batch export failed:', err);
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(null);
    }
  };

  // Printable Component Renderer
  const renderActiveReportComponent = (isForModal: boolean = false) => {
    switch (activeReportCategory) {
      case 'class_monthly':
        return (
          <PDFClassMonthlyReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            period={currentPeriod}
            students={classStudents}
            subjects={subjects}
            scoresMap={scoresMap}
            printedBy={currentUserEmail}
          />
        );
      case 'class_sem1':
        return (
          <PDFClassSemesterReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            semester={1}
            students={classStudents}
            subjects={subjects}
            periods={periods}
            scoresMap={scoresMap}
            printedBy={currentUserEmail}
          />
        );
      case 'class_sem2':
        return (
          <PDFClassSemesterReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            semester={2}
            students={classStudents}
            subjects={subjects}
            periods={periods}
            scoresMap={scoresMap}
            printedBy={currentUserEmail}
          />
        );
      case 'class_annual':
        return (
          <PDFClassAnnualReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            students={classStudents}
            subjects={subjects}
            periods={periods}
            scoresMap={scoresMap}
            printedBy={currentUserEmail}
          />
        );
      case 'subject':
        return currentSubject ? (
          <PDFSubjectReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            subject={currentSubject}
            mode={subjectReportMode}
            selectedPeriodCode={selectedPeriodCode}
            periodName={currentPeriod?.name}
            students={classStudents}
            periods={periods}
            scoresMap={scoresMap}
            printedBy={currentUserEmail}
          />
        ) : null;
      case 'individual':
        return currentStudent ? (
          <PDFIndividualScoreReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            student={currentStudent}
            allClassStudents={classStudents}
            subjects={subjects}
            periods={periods}
            scoresMap={scoresMap}
            printedBy={currentUserEmail}
          />
        ) : null;
      case 'tracking_book':
        return currentStudent ? (
          <PDFTrackingBookReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            student={currentStudent}
            allClassStudents={classStudents}
            subjects={subjects}
            periods={periods}
            scoresMap={scoresMap}
            attendanceRecords={attendanceRecords}
            behaviorRecords={behaviorRecords}
            printedBy={currentUserEmail}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 font-lao pb-12">
      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle className="w-5 h-5 text-emerald-200" />
          <div>
            <p className="text-xs font-bold">ດາວໂຫຼດ PDF ສຳເລັດແລ້ວ!</p>
            <p className="text-3xs text-emerald-100 font-mono">{downloadSuccessToast}</p>
          </div>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
              BUILD 3 • PDF REPORT ENGINE
            </span>
            <span className="text-2xs text-slate-400 font-mono">Font Phetsarath OT • A4 Ready</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            ລະບົບລາຍງານ ແລະ ອອກໃບຄະແນນ PDF (Reports Studio)
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            ສ້າງລາຍງານຄະແນນທັງ 4 ຮູບແບບຫຼັກ: ນັກຮຽນທັງຫ້ອງ, ລາຍວິຊາ, ໃບຄະແນນບຸກຄົນ ແລະ ປຶ້ມຕິດຕາມ
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-semibold flex items-center gap-2 transition border ${
              showHistory
                ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>ປະຫວັດການສ້າງ ({reportHistory.length})</span>
          </button>

          <button
            onClick={() => setIsPreviewOpen(true)}
            className="px-4 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
          >
            <Eye className="w-4 h-4 text-blue-400" />
            <span>ເບິ່ງຕົວຢ່າງ (Preview PDF)</span>
          </button>

          <button
            onClick={handleDirectDownload}
            disabled={isGeneratingDirectDownload}
            className="px-4 py-2 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs"
          >
            {isGeneratingDirectDownload ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>ກຳລັງສ້າງ PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>ດາວໂຫຼດ PDF ດຽວນີ້</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* History Drawer Section (Requirement 23) */}
      {showHistory && (
        <div className="bg-slate-900 text-slate-100 rounded-3xl p-5 border border-slate-800 shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">
                ປະຫວັດການສ້າງລາຍງານ (Report History Logs) — Requirement 23
              </h3>
            </div>
            <button
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-3xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 px-2.5 py-1 rounded-xl"
            >
              <RefreshCw className={`w-3 h-3 ${loadingHistory ? 'animate-spin' : ''}`} />
              <span>ໂຫຼດຂໍ້ມູນໃໝ່</span>
            </button>
          </div>

          {reportHistory.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-xs">
              ຍັງບໍ່ມີປະຫວັດການດາວໂຫຼດລາຍງານໃນຖານຂໍ້ມູນ
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-2xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">ປະເພດ</th>
                    <th className="py-2 px-3">ຫົວຂໍ້ລາຍງານ</th>
                    <th className="py-2 px-3 font-mono">ຊື່ໄຟລ໌ (FileName)</th>
                    <th className="py-2 px-3">ຫ້ອງ / ວິຊາ</th>
                    <th className="py-2 px-3">ຜູ້ສ້າງ (Generated By)</th>
                    <th className="py-2 px-3">ວັນທີສ້າງ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {reportHistory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-blue-900/60 text-blue-300 border border-blue-700/50">
                          {item.reportType}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-200">{item.reportTitle}</td>
                      <td className="py-2 px-3 font-mono text-emerald-400 text-3xs">{item.fileName}</td>
                      <td className="py-2 px-3 text-slate-400">
                        {item.className ? `ຫ້ອງ ${item.className}` : ''} {item.subjectName ? `• ${item.subjectName}` : ''}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-3xs">{item.generatedBy}</td>
                      <td className="py-2 px-3 text-slate-400 text-3xs">
                        {new Date(item.generatedAt).toLocaleString('lo-LA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4 Report Category Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category A: Class Reports (Monthly, Sem1, Sem2, Annual) */}
        <div
          onClick={() => setActiveReportCategory('class_monthly')}
          className={`p-5 rounded-3xl border cursor-pointer transition relative ${
            activeReportCategory.startsWith('class_')
              ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-200 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">A. PDF ນັກຮຽນທັງໝົດໃນຫ້ອງ</h3>
          <p className="text-slate-500 text-2xs mt-1">
            ສັງລວມຄະແນນລາຍເດືອນ, ພາກ I, ພາກ II ແລະ ສິ້ນສົກຮຽນ ພ້ອມຈັດອັນດັບ 1, 2, 2, 4
          </p>
          {activeReportCategory.startsWith('class_') && (
            <div className="mt-3 flex items-center gap-1.5 text-blue-800 text-2xs font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
              <span>ກຳລັງເລືອກ</span>
            </div>
          )}
        </div>

        {/* Category B: Subject Report */}
        <div
          onClick={() => setActiveReportCategory('subject')}
          className={`p-5 rounded-3xl border cursor-pointer transition relative ${
            activeReportCategory === 'subject'
              ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">B. PDF ຕາມລາຍວິຊາ</h3>
          <p className="text-slate-500 text-2xs mt-1">
            ໃບຄະແນນວິຊາສະເພາະທັງຫ້ອງ ສຳລັບຄູສອນປະຈຳວິຊາ (ລາຍງວດ ຫຼື ສະຫຼຸບທັງປີ)
          </p>
          {activeReportCategory === 'subject' && (
            <div className="mt-3 flex items-center gap-1.5 text-indigo-800 text-2xs font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <span>ກຳລັງເລືອກ</span>
            </div>
          )}
        </div>

        {/* Category C: Individual Score Sheet */}
        <div
          onClick={() => setActiveReportCategory('individual')}
          className={`p-5 rounded-3xl border cursor-pointer transition relative ${
            activeReportCategory === 'individual'
              ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-200 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">C. PDF ໃບຄະແນນບຸກຄົນ</h3>
          <p className="text-slate-500 text-2xs mt-1">
            ໃບລາຍງານຜົນການຮຽນ A4 Portrait ພ້ອມຫົວເຈ້ຍໂຮງຮຽນ, ທຸກວິຊາ ແລະ ລາຍເຊັນ
          </p>
          {activeReportCategory === 'individual' && (
            <div className="mt-3 flex items-center gap-1.5 text-emerald-800 text-2xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              <span>ກຳລັງເລືອກ</span>
            </div>
          )}
        </div>

        {/* Category D: Student Tracking Book */}
        <div
          onClick={() => setActiveReportCategory('tracking_book')}
          className={`p-5 rounded-3xl border cursor-pointer transition relative ${
            activeReportCategory === 'tracking_book'
              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-200 shadow-sm'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
          }`}
        >
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-black text-slate-900 text-sm">D. PDF ປຶ້ມຕິດຕາມບຸກຄົນ</h3>
          <p className="text-slate-500 text-2xs mt-1">
            ແບບພິມປຶ້ມຕິດຕາມກະຊວງສຶກສາ A4 Landscape (ຄະແນນ, ຂາດຮຽນ, ຄຸນສົມບັດ, ອອກແຮງງານ)
          </p>
          {activeReportCategory === 'tracking_book' && (
            <div className="mt-3 flex items-center gap-1.5 text-amber-800 text-2xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
              <span>ກຳລັງເລືອກ</span>
            </div>
          )}
        </div>
      </div>

      {/* Control & Configuration Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-4">
            {/* Class Selector */}
            <div>
              <label className="block text-2xs font-bold text-slate-600 mb-1">ເລືອກຫ້ອງຮຽນ:</label>
              <select
                value={selectedClassId}
                onChange={e => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    ຫ້ອງ {c.grade} {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-selectors for Class Reports */}
            {activeReportCategory.startsWith('class_') && (
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  onClick={() => setActiveReportCategory('class_monthly')}
                  className={`px-3 py-1 rounded-xl text-2xs font-bold transition ${
                    activeReportCategory === 'class_monthly'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ລາຍເດືອນ
                </button>
                <button
                  onClick={() => setActiveReportCategory('class_sem1')}
                  className={`px-3 py-1 rounded-xl text-2xs font-bold transition ${
                    activeReportCategory === 'class_sem1'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ສະຫຼຸບ ພາກ I
                </button>
                <button
                  onClick={() => setActiveReportCategory('class_sem2')}
                  className={`px-3 py-1 rounded-xl text-2xs font-bold transition ${
                    activeReportCategory === 'class_sem2'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ສະຫຼຸບ ພາກ II
                </button>
                <button
                  onClick={() => setActiveReportCategory('class_annual')}
                  className={`px-3 py-1 rounded-xl text-2xs font-bold transition ${
                    activeReportCategory === 'class_annual'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ສະຫຼຸບ ສິ້ນສົກຮຽນ
                </button>
              </div>
            )}

            {/* Month selector for Monthly Class Report */}
            {activeReportCategory === 'class_monthly' && (
              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">ເລືອກເດືອນ:</label>
                <select
                  value={selectedPeriodCode}
                  onChange={e => setSelectedPeriodCode(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  {periods
                    .filter(p => !p.isExam)
                    .map(p => (
                      <option key={p.id} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Subject selector for Subject Report */}
            {activeReportCategory === 'subject' && (
              <>
                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-1">ເລືອກວິຊາ:</label>
                  <select
                    value={selectedSubjectId}
                    onChange={e => setSelectedSubjectId(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-bold text-slate-600 mb-1">ຮູບແບບລາຍງານ:</label>
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                    <button
                      onClick={() => setSubjectReportMode('single_period')}
                      className={`px-3 py-1 rounded-xl text-2xs font-bold transition ${
                        subjectReportMode === 'single_period'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      ລາຍງວດສະເພາະ
                    </button>
                    <button
                      onClick={() => setSubjectReportMode('annual_summary')}
                      className={`px-3 py-1 rounded-xl text-2xs font-bold transition ${
                        subjectReportMode === 'annual_summary'
                          ? 'bg-white text-indigo-700 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      ສະຫຼຸບທັງປີ (ຄູປະຈຳວິຊາ)
                    </button>
                  </div>
                </div>

                {subjectReportMode === 'single_period' && (
                  <div>
                    <label className="block text-2xs font-bold text-slate-600 mb-1">ງວດຄະແນນ:</label>
                    <select
                      value={selectedPeriodCode}
                      onChange={e => setSelectedPeriodCode(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                    >
                      {periods.map(p => (
                        <option key={p.id} value={p.code}>
                          {p.name}
                        </option>
                      ))}
                      <option value="sem1">ຄະແນນພາກຮຽນ I</option>
                      <option value="sem2">ຄະແນນພາກຮຽນ II</option>
                      <option value="annual">ຄະແນນສະເລ່ຍໝົດປີ</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Student selector for Individual / Tracking Book */}
            {(activeReportCategory === 'individual' || activeReportCategory === 'tracking_book') && (
              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">ເລືອກນັກຮຽນ:</label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800"
                >
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      #{s.rollNumber} {s.title} {s.firstName} {s.lastName}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Batch Export Button (Requirement 11) */}
          <div className="flex items-center gap-2">
            <select
              value={batchType}
              onChange={e => setBatchType(e.target.value as any)}
              className="bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 text-2xs font-bold text-slate-700"
            >
              <option value="individual">Batch: ໃບຄະແນນທຸກຄົນ (A4 Portrait)</option>
              <option value="tracking_book">Batch: ປຶ້ມຕິດຕາມທຸກຄົນ (A4 Landscape)</option>
            </select>

            <button
              onClick={handleBatchExport}
              disabled={isBatchExporting || classStudents.length === 0}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs disabled:opacity-50"
            >
              {isBatchExporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>ກຳລັງສ້າງ {batchProgress?.current}/{batchProgress?.total}...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Export All Students PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Auto File Name preview chip */}
        <div className="flex flex-wrap items-center justify-between text-2xs text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-sans font-semibold">ຊື່ໄຟລ໌ມາດຕະຖານ:</span>
            <span className="bg-slate-100 px-2 py-0.5 rounded text-blue-900 font-bold border border-slate-200">
              {currentFileName}
            </span>
          </div>
          <div>
            <span>ຂະໜາດເຈ້ຍ: A4 ({reportInfo.orientation.toUpperCase()})</span>
          </div>
        </div>
      </div>

      {/* Live Interactive In-Page Preview Area */}
      <div className="bg-slate-100/70 p-4 sm:p-6 rounded-3xl border border-slate-200/80 shadow-inner">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <h3 className="text-sm font-bold text-slate-800">
              Live Preview: {reportInfo.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDirectPrint}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>ພິມ</span>
            </button>
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 flex items-center gap-1.5 transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>ຂະຫຍາຍເຕັມຈໍ (Fullscreen)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="overflow-x-auto pb-4 custom-scrollbar">
          <div ref={directPrintRef} className="bg-white mx-auto shadow-md rounded-sm">
            {renderActiveReportComponent(false)}
          </div>
        </div>
      </div>

      {/* Hidden Batch Document Container for html2canvas generation */}
      <div className="hidden">
        <div ref={batchPrintRef}>
          <PDFClassBatchReport
            school={school}
            schoolYear={currentYear}
            classRoom={currentClass}
            batchType={batchType}
            students={classStudents}
            subjects={subjects}
            periods={periods}
            scoresMap={scoresMap}
            attendanceRecords={attendanceRecords}
            behaviorRecords={behaviorRecords}
            printedBy={currentUserEmail}
          />
        </div>
      </div>

      {/* Fullscreen Interactive Preview Modal */}
      <PDFPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={reportInfo.title}
        fileName={currentFileName}
        orientation={reportInfo.orientation}
        reportCategory={activeReportCategory}
        meta={{
          schoolYearId: currentYear?.id || '',
          schoolYearName: currentYear?.name,
          classId: currentClass?.id || '',
          className: `${currentClass?.grade || ''} ${currentClass?.name || ''}`,
          studentId: currentStudent?.id,
          studentName: currentStudent ? `${currentStudent.firstName} ${currentStudent.lastName}` : undefined,
          subjectId: currentSubject?.id,
          subjectName: currentSubject?.name,
          periodId: currentPeriod?.id,
          periodName: currentPeriod?.name
        }}
        currentUserEmail={currentUserEmail}
      >
        {renderActiveReportComponent(true)}
      </PDFPreviewModal>
    </div>
  );
};
