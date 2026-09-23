import React from 'react';
import { X, AlertTriangle, ArrowRight, User, CheckCircle2 } from 'lucide-react';
import { Student, ClassRoom } from '../types';
import { StudentCalculatedSummary } from '../services/calculations/scoreEngine';

interface MissingScoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassRoom[];
  summaries: StudentCalculatedSummary[];
  onSelectStudentToEdit: (studentId: string, classId: string) => void;
}

export const MissingScoresModal: React.FC<MissingScoresModalProps> = ({
  isOpen,
  onClose,
  students,
  classes,
  summaries,
  onSelectStudentToEdit,
}) => {
  if (!isOpen) return null;

  // Filter only students with missing scores
  const incompleteSummaries = summaries.filter(s => s.missingItems.length > 0);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 font-lao animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">
                ລາຍງານຄະແນນທີ່ຍັງຂາດ (Missing Scores Report)
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                ພົບນັກຮຽນທີ່ຍັງປ້ອນຄະແນນບໍ່ຄົບຈຳນວນ {incompleteSummaries.length} ຄົນ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar bg-slate-50">
          {incompleteSummaries.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                ຄະແນນຄົບຖ້ວນທຸກຄົນແລ້ວ!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                ບໍ່ພົບລາຍການຄະແນນທີ່ຄ້າງປ້ອນໃນຫ້ອງນີ້
              </p>
            </div>
          ) : (
            incompleteSummaries.map((sum) => {
              const student = sum.student || students.find(s => s.id === sum.studentId);
              const classroom = classes.find(c => c.id === student?.classId);

              return (
                <div
                  key={sum.studentId}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs hover:border-blue-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center font-mono">
                        {student?.rollNumber || '—'}
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        {student?.title} {student?.firstName} {student?.lastName}
                      </span>
                      <span className="text-2xs text-slate-400 font-mono">
                        ({student?.studentId})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-2xs bg-slate-100 text-slate-600">
                        ຫ້ອງ {classroom?.name || '—'}
                      </span>
                    </div>

                    {/* Missing badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sum.missingItems.map((m, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-2xs bg-rose-50 text-rose-800 border border-rose-200"
                        >
                          <span className="font-semibold">{m.subjectName}:</span>
                          <span>{m.periodName}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      if (student) {
                        onSelectStudentToEdit(student.id, student.classId);
                      }
                    }}
                    className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition flex-shrink-0"
                  >
                    <span>ປ້ອນຄະແນນ</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            ຄລິກ "ປ້ອນຄະແນນ" ເພື່ອໂດດໄປໜ້າປ້ອນຄະແນນຂອງນັກຮຽນຄົນນັ້ນທັນທີ
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            ປິດ
          </button>
        </div>
      </div>
    </div>
  );
};
