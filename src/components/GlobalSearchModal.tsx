import React, { useState } from 'react';
import {
  Search,
  User,
  X,
  ArrowRight,
  BookOpen,
  Edit3
} from 'lucide-react';
import { Student, ClassRoom } from '../types';
import { studentMatchesSearch } from '../services/studentHelper';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  classes: ClassRoom[];
  onSelectStudent: (studentId: string) => void;
  onNavigateToScoreEntry?: (studentId: string, classId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  students,
  classes,
  onSelectStudent,
  onNavigateToScoreEntry
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = query.trim() === '' ? [] : students.filter(s =>
    studentMatchesSearch(s, query)
  ).slice(0, 8);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-start justify-center p-4 pt-16 sm:pt-24 font-lao">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input bar */}
        <div className="p-4 border-b border-slate-100 flex items-center gap-3">
          <Search className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ຄົ້ນຫາທົ່ວລະບົບ: ຊື່, ນາມສະກຸນ, Student ID (ເຊັ່ນ: ST-0701), ເລກທີ..."
            className="w-full text-sm font-medium text-slate-800 focus:outline-none placeholder:text-slate-400 font-lao"
          />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {query.trim() === '' ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ພິມຊື່, ນາມສະກຸນ, ຫຼື ລະຫັດນັກຮຽນເພື່ອຄົ້ນຫາ
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              ບໍ່ພົບນັກຮຽນທີ່ກົງກັບ "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(st => {
                const cl = classes.find(c => c.id === st.classId);
                return (
                  <div
                    key={st.id}
                    className="w-full p-3 rounded-2xl hover:bg-slate-50 flex items-center justify-between text-left transition"
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer flex-1"
                      onClick={() => {
                        onSelectStudent(st.id);
                        onClose();
                      }}
                    >
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        #{st.rollNumber}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 hover:text-blue-700">
                          {st.title} {st.firstName} {st.lastName}
                        </div>
                        <div className="text-2xs text-slate-500">
                          ID: <span className="font-mono font-semibold">{st.studentId}</span> • ຫ້ອງ: {cl?.name || '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onNavigateToScoreEntry && (
                        <button
                          onClick={() => {
                            onNavigateToScoreEntry(st.id, st.classId);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-xl text-2xs font-semibold flex items-center gap-1 transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>ປ້ອນຄະແນນ</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onSelectStudent(st.id);
                          onClose();
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-2xs font-semibold flex items-center gap-1 transition"
                      >
                        <BookOpen className="w-3 h-3" />
                        <span>ປຶ້ມຕິດຕາມ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-100 text-2xs text-slate-400 flex items-center justify-between">
          <span>ກົດ Esc ເພື່ອປິດໜ້າຕ່າງຄົ້ນຫາ</span>
          <span>ຄົ້ນຫາໄວຜ່ານທຸກຫ້ອງຮຽນ</span>
        </div>
      </div>
    </div>
  );
};
