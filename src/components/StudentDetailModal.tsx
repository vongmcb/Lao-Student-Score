import React, { useState } from 'react';
import {
  X,
  User,
  MapPin,
  Home,
  Users,
  Phone,
  Calendar,
  Award,
  Edit2,
  FileText,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import { Student, ClassRoom, Subject, ScorePeriod } from '../types';
import { StudentCalculatedSummary, formatScore } from '../services/calculations/scoreEngine';
import { SubjectScoreSummary } from './SubjectScoreSummary';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classroom?: ClassRoom;
  summary?: StudentCalculatedSummary;
  subjects?: Subject[];
  periods?: ScorePeriod[];
  onNavigateToEditScore?: (studentId: string, classId: string) => void;
  onEditStudent?: (student: Student) => void;
  onExportIndividualPDF?: (student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  classroom,
  summary,
  subjects = [],
  periods = [],
  onNavigateToEditScore,
  onEditStudent,
  onExportIndividualPDF
}) => {
  const [showScoresSection, setShowScoresSection] = useState(true);

  if (!isOpen || !student) return null;

  const rollNum = student.studentNumber || student.rollNumber || 1;
  const prefix = student.prefix || student.title || 'ທ້າວ';
  const ethnicity = student.ethnicity || 'ລາວ';
  const dob = student.dateOfBirth || student.dob || '—';

  const birthVillage = student.birthplace?.village || student.village || '—';
  const birthDistrict = student.birthplace?.district || student.district || '—';
  const birthProvince = student.birthplace?.province || student.province || '—';

  const curVillage = student.currentAddress?.village || student.village || '—';
  const curDistrict = student.currentAddress?.district || student.district || '—';
  const curProvince = student.currentAddress?.province || student.province || '—';

  const fatherFirst = student.father?.firstName || (student.fatherInfo ? student.fatherInfo.split(' ')[0] : '');
  const fatherLast = student.father?.lastName || (student.fatherInfo ? student.fatherInfo.split(' ').slice(1).join(' ') : '');
  const fatherOcc = student.father?.occupation || student.guardianOccupation || '';

  const motherFirst = student.mother?.firstName || (student.motherInfo ? student.motherInfo.split(' ')[0] : '');
  const motherLast = student.mother?.lastName || (student.motherInfo ? student.motherInfo.split(' ').slice(1).join(' ') : '');
  const motherOcc = student.mother?.occupation || '';

  const phone = student.guardianPhone || student.phone || '—';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-lao animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
              #{rollNum}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {prefix} {student.firstName} {student.lastName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  {student.studentId || `ST-${String(rollNum).padStart(4, '0')}`}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5 flex flex-wrap items-center gap-2">
                <span>ຫ້ອງ: <strong className="text-white">{classroom?.name || '—'}</strong></span>
                <span>•</span>
                <span>ຊົນເຜົ່າ: <strong className="text-white">{ethnicity}</strong></span>
                <span>•</span>
                <span>ເພດ: {prefix === 'ນາງ' || student.gender === 'female' ? 'ຍິງ' : 'ຊາຍ'}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onExportIndividualPDF && (
              <button
                onClick={() => onExportIndividualPDF(student)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                title="ອອກໃບຄະແນນ PDF ບຸກຄົນ"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>ອອກໃບຄະແນນ PDF</span>
              </button>
            )}

            {onEditStudent && (
              <button
                onClick={() => onEditStudent(student)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                title="ແກ້ໄຂຂໍ້ມູນນັກຮຽນ"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-400" />
                <span>ແກ້ໄຂຂໍ້ມູນ</span>
              </button>
            )}

            {onNavigateToEditScore && (
              <button
                onClick={() => {
                  onClose();
                  onNavigateToEditScore(student.id, student.classId);
                }}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Award className="w-3.5 h-3.5" />
                <span>ປ້ອນ/ແກ້ໄຂຄະແນນ</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar bg-slate-50/50">
          {/* ========================================================
              SECTION 11: STUDENT PROFILE CARDS
             ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: [ ຂໍ້ມູນນັກຮຽນ ] */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-blue-600" />
                <span>[ ຂໍ້ມູນນັກຮຽນ ]</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-2xs">ຊື່ ແລະ ນາມສະກຸນ:</span>
                  <strong className="text-slate-900 font-semibold text-sm">
                    {prefix} {student.firstName} {student.lastName}
                  </strong>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-2xs">ລຳດັບ / ຄຳນຳໜ້າ:</span>
                    <span className="font-bold text-blue-900">#{rollNum} ({prefix})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-2xs">ຊົນເຜົ່າ:</span>
                    <span className="font-semibold text-slate-800">{ethnicity}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs">ວັນເດືອນປີເກີດ:</span>
                  <span className="font-mono text-slate-800 font-semibold">{dob}</span>
                </div>
              </div>
            </div>

            {/* Card 2: [ ບ່ອນເກີດ ] & [ ທີ່ຢູ່ປັດຈຸບັນ ] */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>[ ບ່ອນເກີດ & ທີ່ຢູ່ປັດຈຸບັນ ]</span>
              </h3>
              <div className="space-y-2.5 text-xs">
                {/* ບ່ອນເກີດ */}
                <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                  <span className="text-emerald-800 font-bold block text-2xs mb-0.5">[ ບ່ອນເກີດ ]:</span>
                  <div className="text-slate-700 space-y-0.5 text-2xs">
                    <div>ບ້ານ: <strong>{birthVillage}</strong></div>
                    <div>ເມືອງ: <strong>{birthDistrict}</strong></div>
                    <div>ແຂວງ: <strong>{birthProvince}</strong></div>
                  </div>
                </div>

                {/* ທີ່ຢູ່ປັດຈຸບັນ */}
                <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                  <span className="text-indigo-800 font-bold block text-2xs mb-0.5">[ ທີ່ຢູ່ປັດຈຸບັນ ]:</span>
                  <div className="text-slate-700 space-y-0.5 text-2xs">
                    <div>ບ້ານ: <strong>{curVillage}</strong></div>
                    <div>ເມືອງ: <strong>{curDistrict}</strong></div>
                    <div>ແຂວງ: <strong>{curProvince}</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: [ ຄອບຄົວ & ຜູ້ປົກຄອງ ] */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span>[ ຄອບຄົວ & ຜູ້ປົກຄອງ ]</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-2xs">ຂໍ້ມູນພໍ່:</span>
                  <div className="font-semibold text-slate-800">
                    {fatherFirst ? `${fatherFirst} ${fatherLast}` : '—'}
                  </div>
                  {fatherOcc && (
                    <div className="text-2xs text-slate-500">ອາຊີບ: {fatherOcc}</div>
                  )}
                </div>

                <div>
                  <span className="text-slate-400 block text-2xs">ຂໍ້ມູນແມ່:</span>
                  <div className="font-semibold text-slate-800">
                    {motherFirst ? `${motherFirst} ${motherLast}` : '—'}
                  </div>
                  {motherOcc && (
                    <div className="text-2xs text-slate-500">ອາຊີບ: {motherOcc}</div>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-100">
                  <span className="text-slate-400 block text-2xs">ເບີໂທຜູ້ປົກຄອງ:</span>
                  <strong className="text-teal-700 font-mono font-bold text-sm block">
                    {phone}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar if summary is available */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-2xs font-semibold text-slate-500 uppercase">ສະເລ່ຍ ພາກ I</span>
                <div className="text-xl font-bold text-blue-700 mt-0.5 font-mono">
                  {summary.avgSemester1 !== null ? formatScore(summary.avgSemester1, 2) : '—'}
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">
                  {summary.statusSem1Label}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-2xs font-semibold text-slate-500 uppercase">ສະເລ່ຍ ພາກ II</span>
                <div className="text-xl font-bold text-indigo-700 mt-0.5 font-mono">
                  {summary.avgSemester2 !== null ? formatScore(summary.avgSemester2, 2) : '—'}
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">
                  {summary.statusSem2Label}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-2xs font-semibold text-slate-500 uppercase">ສະເລ່ຍໝົດປີ</span>
                <div className="text-xl font-bold text-emerald-700 mt-0.5 font-mono">
                  {summary.avgAnnual !== null ? formatScore(summary.avgAnnual, 2) : '—'}
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">
                  {summary.statusAnnualLabel}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <span className="text-2xs font-semibold text-slate-500 uppercase">ອັນດັບທີ (ທັງປີ)</span>
                <div className="text-xl font-bold text-amber-600 mt-0.5 flex items-center gap-1">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>{summary.rankAnnual ? `ທີ ${summary.rankAnnual}` : '—'}</span>
                </div>
                <div className="text-2xs text-slate-400 mt-0.5">
                  {summary.isAnnualComplete ? 'ຄຳນວນສົມບູນ' : 'ລໍຖ້າຄະແນນຄົບ'}
                </div>
              </div>
            </div>
          )}

          {/* Missing scores alert if any */}
          {summary && summary.missingItems && summary.missingItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-xs mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>ຄະແນນທີ່ຍັງຂາດ ({summary.missingItems.length} ລາຍການ):</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.missingItems.map((m, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs font-medium bg-white text-amber-900 border border-amber-200"
                  >
                    <span className="font-semibold text-slate-800">{m.subjectName}:</span>
                    <span className="text-rose-600 font-mono">{m.periodName}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section [ ຄະແນນ ]: Toggle and Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div
              onClick={() => setShowScoresSection(!showScoresSection)}
              className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/80 transition"
            >
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>[ ຄະແນນ ] ຕາຕະລາງຄະແນນທຸກລາຍວິຊາ ແລະ ການຄຳນວນ</span>
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-700 font-semibold">
                  {showScoresSection ? 'ຫຍໍ້ຕາຕະລາງ' : 'ເບິ່ງຄະແນນລະອຽດ'}
                </span>
                {showScoresSection ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
              </div>
            </div>

            {showScoresSection && summary && subjects.length > 0 && (
              <div className="p-4">
                <SubjectScoreSummary
                  student={student}
                  summary={summary}
                  subjects={subjects}
                  periods={periods}
                />
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            ລະບົບຄຳນວນຄະແນນອັດຕະໂນມັດ ຕາມຫຼັກສູດກະຊວງສຶກສາທິການ ແລະ ກິລາ
          </div>

          <div className="flex items-center gap-2">
            {onExportIndividualPDF && (
              <button
                type="button"
                onClick={() => onExportIndividualPDF(student)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ອອກໃບຄະແນນ PDF</span>
              </button>
            )}

            {onEditStudent && (
              <button
                type="button"
                onClick={() => onEditStudent(student)}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>ແກ້ໄຂຂໍ້ມູນ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              ປິດໜ້າຕ່າງ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
