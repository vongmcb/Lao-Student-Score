import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  ArrowUpDown,
  X
} from 'lucide-react';
import { Subject } from '../types';
import { createSubject, updateSubject, deleteSubject } from '../services/dataService';

interface SubjectsViewProps {
  subjects: Subject[];
  onRefresh: () => void;
}

export const SubjectsView: React.FC<SubjectsViewProps> = ({ subjects, onRefresh }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({
    name: '',
    code: '',
    order: 1,
    isActive: true,
  });

  const handleOpenAdd = () => {
    setEditingSubject(null);
    const nextOrder = subjects.length > 0 ? Math.max(...subjects.map(s => s.order)) + 1 : 1;
    setFormData({
      name: '',
      code: '',
      order: nextOrder,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setFormData(sub);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    try {
      if (editingSubject) {
        await updateSubject(editingSubject.id, formData);
      } else {
        await createSubject(formData as Omit<Subject, 'id'>);
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກ');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບວິຊາ: "${name}"?`)) {
      try {
        await deleteSubject(id);
        onRefresh();
      } catch (err) {
        console.error(err);
        alert('ບໍ່ສາມາດລຶບວິຊາໄດ້');
      }
    }
  };

  const handleToggleActive = async (sub: Subject) => {
    try {
      await updateSubject(sub.id, { isActive: !sub.isActive });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ລາຍວິຊາຮຽນ (Subject Database)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            ກຳນົດລາຍວິຊາ, ລຳດັບການສະແດງຜົນ ແລະ ເປີດ/ປິດການນຳໃຊ້ (ບໍ່ Lock ຈຳນວນວິຊາ)
          </p>
        </div>

        <button
          id="btn-add-subject"
          onClick={handleOpenAdd}
          className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-xs self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> ເພີ່ມວິຊາໃໝ່
        </button>
      </div>

      {/* Subjects Grid & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3.5 px-4 w-16">ລຳດັບ</th>
                <th className="py-3.5 px-4">ຊື່ວິຊາຮຽນ</th>
                <th className="py-3.5 px-4">ລະຫັດວິຊາ (Code)</th>
                <th className="py-3.5 px-4">ສະຖານະການສອນ</th>
                <th className="py-3.5 px-4 text-right">ຈັດການ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-600">
                    {sub.order}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{sub.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500 font-semibold">
                    {sub.code || '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleActive(sub)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                        sub.isActive
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {sub.isActive ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" /> ເປີດໃຊ້ງານ
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> ປິດໃຊ້ງານ
                        </>
                      )}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleOpenEdit(sub)}
                        className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition"
                        title="ແກ້ໄຂ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sub.id, sub.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="ລຶບ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Subject */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingSubject ? 'ແກ້ໄຂລາຍວິຊາ' : 'ເພີ່ມວິຊາໃໝ່'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ຊື່ວິຊາຮຽນ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ຕົວຢ່າງ: ພາສາລາວ, ຄະນິດສາດ..."
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ລະຫັດວິຊາ (Code)
                  </label>
                  <input
                    type="text"
                    placeholder="MATH, LAO..."
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ລຳດັບ (Order)
                  </label>
                  <input
                    type="number"
                    value={formData.order || 1}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="isActiveCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
                  ເປີດໃຊ້ງານວິຊານີ້ໃນການປ້ອນຄະແນນ
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ຍົກເລີກ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
                >
                  {editingSubject ? 'ບັນທຶກ' : 'ເພີ່ມວິຊາ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
