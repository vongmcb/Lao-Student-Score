import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  Upload,
  ArrowUpDown,
  BookOpen,
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Student,
  ClassRoom,
  SchoolYear,
  Subject,
  ScorePeriod,
  ScoreRecord
} from '../types';
import {
  createStudent,
  updateStudent,
  deleteStudent,
  batchCreateStudents
} from '../services/dataService';
import {
  studentMatchesSearch,
  exportStudentsToExcel,
  downloadExcelTemplate
} from '../services/studentHelper';
import { StudentFormModal } from '../components/StudentFormModal';
import { StudentExcelImportModal } from '../components/StudentExcelImportModal';
import { StudentDetailModal } from '../components/StudentDetailModal';
import { calculateStudentSummary } from '../services/calculations/scoreEngine';

interface StudentsViewProps {
  students: Student[];
  classes: ClassRoom[];
  schoolYears: SchoolYear[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  onRefresh: () => void;
  onSelectStudentForTracking?: (studentId: string) => void;
  onNavigateToScoreEntry?: (studentId: string, classId: string) => void;
  onExportIndividualPDF?: (student: Student) => void;
  scores?: ScoreRecord[];
  subjects?: Subject[];
  periods?: ScorePeriod[];
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  students,
  classes,
  schoolYears,
  selectedClassId,
  onSelectClass,
  onRefresh,
  onSelectStudentForTracking,
  onNavigateToScoreEntry,
  onExportIndividualPDF,
  scores = [],
  subjects = [],
  periods = []
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'studentNumber' | 'firstName' | 'studentId'>('studentNumber');
  const [sortAsc, setSortAsc] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);

  const [profileStudent, setProfileStudent] = useState<Student | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter students based on class selection and rich multi-field search
  const filtered = students.filter(s => {
    const matchesClass = selectedClassId === 'all' || s.classId === selectedClassId;
    const matchesSearch = studentMatchesSearch(s, searchTerm);
    return matchesClass && matchesSearch;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === 'studentNumber') {
      const numA = a.studentNumber || a.rollNumber || 0;
      const numB = b.studentNumber || b.rollNumber || 0;
      return sortAsc ? numA - numB : numB - numA;
    } else if (sortField === 'firstName') {
      return sortAsc ? a.firstName.localeCompare(b.firstName) : b.firstName.localeCompare(a.firstName);
    } else {
      const idA = a.studentId || '';
      const idB = b.studentId || '';
      return sortAsc ? idA.localeCompare(idB) : idB.localeCompare(idA);
    }
  });

  const nextAvailableNumber = filtered.length > 0
    ? Math.max(...filtered.map(s => s.studentNumber || s.rollNumber || 0)) + 1
    : 1;

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (st: Student, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingStudent(st);
    setIsFormModalOpen(true);
  };

  const handleOpenProfile = (st: Student) => {
    setProfileStudent(st);
    setIsProfileModalOpen(true);
  };

  const handleSaveStudent = async (data: Partial<Student>) => {
    if (editingStudent) {
      await updateStudent(editingStudent.id, data);
      showToast(`ອັບເດດຂໍ້ມູນ ${data.prefix || ''} ${data.firstName} ${data.lastName} ສຳເລັດ`);
    } else {
      await createStudent(data);
      showToast(`ເພີ່ມນັກຮຽນ ${data.prefix || ''} ${data.firstName} ${data.lastName} ສຳເລັດ`);
    }
    onRefresh();
  };

  const handleDelete = async (st: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບຂໍ້ມູນນັກຮຽນ: ${st.prefix || st.title} ${st.firstName} ${st.lastName}?`
    );
    if (!confirmed) return;

    try {
      await deleteStudent(st.id);
      showToast(`ລຶບຂໍ້ມູນນັກຮຽນສຳເລັດແລ້ວ`);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('ບໍ່ສາມາດລຶບນັກຮຽນໄດ້');
    }
  };

  const handleBatchSave = async (studentsToSave: Partial<Student>[]): Promise<number> => {
    const count = await batchCreateStudents(studentsToSave);
    onRefresh();
    return count;
  };

  const handleExportExcel = () => {
    const activeClass = classes.find(c => c.id === selectedClassId);
    const className = activeClass ? activeClass.name : 'ທຸກຫ້ອງ';
    exportStudentsToExcel(filtered, className);
    showToast(`ສົ່ງອອກໄຟລ໌ Excel ສຳເລັດ (${filtered.length} ຄົນ)`);
  };

  const currentClass = classes.find(c => c.id === selectedClassId);

  // Calculate summary if profileStudent is opened
  const profileSummary = profileStudent && subjects.length > 0
    ? calculateStudentSummary(profileStudent, subjects, periods, scores)
    : undefined;

  return (
    <div className="space-y-6 font-lao animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner / Actions bar */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-800 font-semibold text-xs tracking-wider uppercase">
            <Users className="w-4 h-4 text-blue-600" />
            <span>ລະບົບຖານຂໍ້ມູນນັກຮຽນ (Student Database)</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            ລາຍຊື່ນັກຮຽນ {currentClass ? `ຫ້ອງ ${currentClass.name} (${currentClass.grade})` : 'ທຸກຫ້ອງຮຽນ'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ຈັດການຂໍ້ມູນປະຫວັດ 6 ໝວດ, ບ່ອນເກີດ, ທີ່ຢູ່ປັດຈຸບັນ, ຜູ້ປົກຄອງ, ນຳເຂົ້າ-ສົ່ງອອກ Excel 19 ຖັນ
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Template */}
          <button
            type="button"
            onClick={downloadExcelTemplate}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            title="ດາວໂຫຼດຟອມ Excel 19 ຖັນມາດຕະຖານ"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">ຟອມຕົວຢ່າງ Excel</span>
          </button>

          {/* Import Excel */}
          <button
            type="button"
            onClick={() => setIsExcelImportModalOpen(true)}
            className="px-3.5 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 transition"
            title="ນຳເຂົ້າຂໍ້ມູນນັກຮຽນຈາກ Excel"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            <span>Import Excel</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
            title="ສົ່ງອອກຂໍ້ມູນເປັນ Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Export Excel</span>
          </button>

          {/* Add Student */}
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>ເພີ່ມນັກຮຽນໃໝ່</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Class Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-2xs font-bold text-slate-500 uppercase">ຫ້ອງຮຽນ:</span>
            <select
              value={selectedClassId}
              onChange={(e) => onSelectClass(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">ທຸກຫ້ອງຮຽນ (All)</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  ຫ້ອງ {c.name} ({c.grade})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition"
              title="ສະຫຼັບ ລຽງຂຶ້ນ / ລຽງລົງ"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
            >
              <option value="studentNumber">ລຳດັບ (ເລກທີ)</option>
              <option value="firstName">ຊື່ (ກ-ຮ)</option>
              <option value="studentId">ລະຫັດນັກຮຽນ</option>
            </select>
          </div>
        </div>

        {/* Rich Multi-Field Search (Section 10) */}
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ຄົ້ນຫາ: ລຳດັບ, ຊື່, ນາມສະກຸນ, ຊົນເຜົ່າ, ບ້ານເກີດ, ບ້ານປັດຈຸບັນ..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs text-slate-400 hover:text-slate-700"
            >
              ລຶບ
            </button>
          )}
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
          <div className="text-xs text-slate-500">
            ພົບເຫັນທັງໝົດ: <strong className="text-slate-900 font-bold">{sorted.length}</strong> ຄົນ
            {searchTerm && <span className="text-blue-600 ml-1.5">(ຜົນການຄົ້ນຫາ "{searchTerm}")</span>}
          </div>
          <div className="text-2xs text-slate-400">
            * ຄລິກໃສ່ແຖວເພື່ອເບິ່ງ [ ຂໍ້ມູນນັກຮຽນ, ບ່ອນເກີດ, ຄອບຄົວ, ຄະແນນ ]
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 text-center w-12">ລ/ດ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">ລະຫັດ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">ຊື່ ແລະ ນາມສະກຸນ</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">ຊົນເຜົ່າ</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">ວັນເກີດ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">ບ່ອນເກີດ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">ທີ່ຢູ່ປັດຈຸບັນ</th>
                <th className="py-3 px-3.5 whitespace-nowrap">ພໍ່ / ແມ່</th>
                <th className="py-3 px-3.5 whitespace-nowrap font-mono">ເບີໂທຜູ້ປົກຄອງ</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap">ຈັດການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-500">ບໍ່ພົບຂໍ້ມູນນັກຮຽນ</p>
                    <p className="text-2xs text-slate-400 mt-1">
                      ກົດປຸ່ມ "ເພີ່ມນັກຮຽນໃໝ່" ຫຼື "Import Excel" ເພື່ອເລີ່ມຕົ້ນ
                    </p>
                  </td>
                </tr>
              ) : (
                sorted.map((st) => {
                  const rollNum = st.studentNumber || st.rollNumber || 1;
                  const prefix = st.prefix || st.title || 'ທ້າວ';
                  const birthLoc = [
                    st.birthplace?.village || st.village,
                    st.birthplace?.district || st.district
                  ].filter(Boolean).join(', ');

                  const curLoc = [
                    st.currentAddress?.village || st.village,
                    st.currentAddress?.district || st.district
                  ].filter(Boolean).join(', ');

                  const fatherName = st.father?.firstName
                    ? `${st.father.firstName} ${st.father.lastName || ''}`
                    : (st.fatherInfo || '');

                  const motherName = st.mother?.firstName
                    ? `${st.mother.firstName} ${st.mother.lastName || ''}`
                    : (st.motherInfo || '');

                  const parentsDisplay = [
                    fatherName ? `ພໍ່: ${fatherName}` : '',
                    motherName ? `ແມ່: ${motherName}` : ''
                  ].filter(Boolean).join(' | ') || '—';

                  const phoneDisplay = st.guardianPhone || st.phone || '—';

                  return (
                    <tr
                      key={st.id}
                      onClick={() => handleOpenProfile(st)}
                      className="hover:bg-blue-50/40 transition cursor-pointer group"
                    >
                      {/* ລຳດັບ */}
                      <td className="py-2.5 px-3.5 text-center font-bold text-blue-900 font-mono">
                        #{rollNum}
                      </td>

                      {/* ລະຫັດ */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap font-mono text-2xs text-slate-500">
                        {st.studentId || `ST-${String(rollNum).padStart(4, '0')}`}
                      </td>

                      {/* ຊື່ ແລະ ນາມສະກຸນ */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-3xs font-bold ${
                              prefix === 'ນາງ' || st.gender === 'female'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {prefix === 'ນາງ' ? 'ນ' : 'ທ'}
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-blue-700 transition">
                              {prefix} {st.firstName} {st.lastName}
                            </span>
                            {st.notes && (
                              <span className="block text-3xs text-slate-400 truncate max-w-[140px]">
                                {st.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ຊົນເຜົ່າ */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {st.ethnicity || 'ລາວ'}
                        </span>
                      </td>

                      {/* ວັນເກີດ */}
                      <td className="py-2.5 px-3.5 text-center font-mono text-2xs text-slate-600 whitespace-nowrap">
                        {st.dateOfBirth || st.dob || '—'}
                      </td>

                      {/* ບ່ອນເກີດ */}
                      <td className="py-2.5 px-3.5 text-slate-600 text-2xs max-w-[140px] truncate" title={birthLoc}>
                        {birthLoc || '—'}
                      </td>

                      {/* ທີ່ຢູ່ປັດຈຸບັນ */}
                      <td className="py-2.5 px-3.5 text-slate-600 text-2xs max-w-[140px] truncate" title={curLoc}>
                        {curLoc || '—'}
                      </td>

                      {/* ພໍ່ / ແມ່ */}
                      <td className="py-2.5 px-3.5 text-slate-600 text-2xs max-w-[160px] truncate" title={parentsDisplay}>
                        {parentsDisplay}
                      </td>

                      {/* ເບີໂທຜູ້ປົກຄອງ */}
                      <td className="py-2.5 px-3.5 font-mono text-teal-800 text-2xs font-semibold whitespace-nowrap">
                        {phoneDisplay}
                      </td>

                      {/* ຈັດການ */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* Profile view */}
                          <button
                            type="button"
                            onClick={() => handleOpenProfile(st)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="ເບິ່ງໂປຣໄຟລ໌ / ຄະແນນ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Tracking book */}
                          {onSelectStudentForTracking && (
                            <button
                              type="button"
                              onClick={() => onSelectStudentForTracking(st.id)}
                              className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
                              title="ເບິ່ງປຶ້ມຕິດຕາມ"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Individual PDF */}
                          {onExportIndividualPDF && (
                            <button
                              type="button"
                              onClick={() => onExportIndividualPDF(st)}
                              className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                              title="ອອກໃບຄະແນນ PDF ບຸກຄົນ"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(st, e)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                            title="ແກ້ໄຂຂໍ້ມູນ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(st, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="ລຶບນັກຮຽນ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODALS ================= */}

      {/* 1. Add / Edit Student Modal (Section 8 & 9) */}
      <StudentFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveStudent}
        editingStudent={editingStudent}
        classes={classes}
        schoolYears={schoolYears}
        selectedClassId={selectedClassId}
        nextAvailableNumber={nextAvailableNumber}
      />

      {/* 2. Excel Import Modal (Section 13) */}
      <StudentExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onImportSuccess={(count) => {
          showToast(`ນຳເຂົ້ານັກຮຽນ ${count} ຄົນສຳເລັດແລ້ວ!`);
        }}
        onBatchSave={handleBatchSave}
        existingStudents={students}
        classes={classes}
        schoolYears={schoolYears}
        selectedClassId={selectedClassId}
      />

      {/* 3. Student Profile Modal (Section 11) */}
      <StudentDetailModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        student={profileStudent}
        classroom={classes.find(c => c.id === profileStudent?.classId)}
        summary={profileSummary}
        subjects={subjects}
        periods={periods}
        onNavigateToEditScore={onNavigateToScoreEntry}
        onEditStudent={(st) => {
          setIsProfileModalOpen(false);
          handleOpenEdit(st);
        }}
        onExportIndividualPDF={onExportIndividualPDF ? (st) => {
          setIsProfileModalOpen(false);
          onExportIndividualPDF(st);
        } : undefined}
      />
    </div>
  );
};
