import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Layers,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import { School, SchoolYear, ClassRoom } from '../types';
import {
  saveSchoolInfo,
  createSchoolYear,
  createClass,
  deleteClass
} from '../services/dataService';

interface SettingsAndSchoolProps {
  school: School | null;
  schoolYears: SchoolYear[];
  classes: ClassRoom[];
  onRefresh: () => void;
}

export const SettingsAndSchoolView: React.FC<SettingsAndSchoolProps> = ({
  school,
  schoolYears,
  classes,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'school' | 'academic'>('school');

  // School Form state
  const [schoolData, setSchoolData] = useState<Partial<School>>({
    name: school?.name || '',
    province: school?.province || 'ນະຄອນຫຼວງວຽງຈັນ',
    district: school?.district || '',
    cluster: school?.cluster || '',
    phone: school?.phone || '',
    email: school?.email || '',
    address: school?.address || '',
    logoUrl: school?.logoUrl || ''
  });

  const [savingSchool, setSavingSchool] = useState(false);
  const [schoolNotice, setSchoolNotice] = useState<string | null>(null);

  // New Year & Class state
  const [newYearName, setNewYearName] = useState('');
  const [newGrade, setNewGrade] = useState('ມ.7');
  const [newRoom, setNewRoom] = useState('7/3');
  const [newTeacher, setNewTeacher] = useState('');
  const [selectedYearForClass, setSelectedYearForClass] = useState(schoolYears[0]?.id || '');

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchool(true);
    try {
      await saveSchoolInfo(schoolData);
      setSchoolNotice('ບັນທຶກຂໍ້ມູນໂຮງຮຽນຮຽບຮ້ອຍແລ້ວ!');
      setTimeout(() => setSchoolNotice(null), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert('ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໂຮງຮຽນໄດ້');
    } finally {
      setSavingSchool(false);
    }
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearName.trim()) return;
    try {
      await createSchoolYear(newYearName, false);
      setNewYearName('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.trim()) return;
    try {
      await createClass({
        grade: newGrade,
        room: newRoom,
        name: `${newGrade}/${newRoom}`,
        schoolYearId: selectedYearForClass || (schoolYears[0]?.id || ''),
        homeroomTeacher: newTeacher
      });
      setNewRoom('');
      setNewTeacher('');
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (confirm(`ທ່ານແນ່ໃຈບໍ່ວ່າຕ້ອງການລຶບ ${name}?`)) {
      try {
        await deleteClass(id);
        onRefresh();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Sub tabs */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            ການຕັ້ງຄ່າໂຮງຮຽນ ແລະ ສົກຮຽນ (School & Academic Setup)
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            ຈັດການຂໍ້ມູນໂຮງຮຽນ, Logo, ສົກຮຽນ, ຊັ້ນ ແລະ ຫ້ອງຮຽນ
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('school')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'school' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            ຂໍ້ມູນໂຮງຮຽນ
          </button>
          <button
            onClick={() => setActiveTab('academic')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition ${
              activeTab === 'academic' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
            }`}
          >
            ສົກຮຽນ ແລະ ຫ້ອງຮຽນ
          </button>
        </div>
      </div>

      {schoolNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{schoolNotice}</span>
        </div>
      )}

      {/* Tab 1: School Information */}
      {activeTab === 'school' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="max-w-3xl">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              ຂໍ້ມູນໂຮງຮຽນສຳລັບໃບລາຍງານ ແລະ PDF Report
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              ຂໍ້ມູນເຫຼົ່ານີ້ຈະຖືກນຳໄປໃຊ້ເປັນຫົວເຈ້ຍທາງການໃນໃບຄະແນນ ແລະ ປຶ້ມຕິດຕາມ
            </p>

            <form onSubmit={handleSaveSchool} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ຊື່ໂຮງຮຽນ (School Name) *
                </label>
                <input
                  type="text"
                  required
                  value={schoolData.name || ''}
                  onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
                  placeholder="ຕົວຢ່າງ: ໂຮງຮຽນ ມັດທະຍົມສົມບູນ ວຽງຈັນ"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ແຂວງ / ນະຄອນຫຼວງ *
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolData.province || ''}
                    onChange={(e) => setSchoolData({ ...schoolData, province: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ເມືອງ *
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolData.district || ''}
                    onChange={(e) => setSchoolData({ ...schoolData, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ກຸ່ມໂຮງຮຽນ
                  </label>
                  <input
                    type="text"
                    value={schoolData.cluster || ''}
                    onChange={(e) => setSchoolData({ ...schoolData, cluster: e.target.value })}
                    placeholder="ກຸ່ມທີ 1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ເບີໂທລະສັບ
                  </label>
                  <input
                    type="text"
                    value={schoolData.phone || ''}
                    onChange={(e) => setSchoolData({ ...schoolData, phone: e.target.value })}
                    placeholder="021 214567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ອີເມວ
                  </label>
                  <input
                    type="email"
                    value={schoolData.email || ''}
                    onChange={(e) => setSchoolData({ ...schoolData, email: e.target.value })}
                    placeholder="school@moes.edu.la"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ທີ່ຢູ່ໂຮງຮຽນ
                </label>
                <input
                  type="text"
                  value={schoolData.address || ''}
                  onChange={(e) => setSchoolData({ ...schoolData, address: e.target.value })}
                  placeholder="ບ້ານ, ຖະໜົນ..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Logo URL ໂຮງຮຽນ
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="text"
                    value={schoolData.logoUrl || ''}
                    onChange={(e) => setSchoolData({ ...schoolData, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                  {schoolData.logoUrl && (
                    <img
                      src={schoolData.logoUrl}
                      alt="Logo Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSchool}
                  className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-xs"
                >
                  <Save className="w-4 h-4" />
                  {savingSchool ? 'ກຳລັງບັນທຶກ...' : 'ບັນທຶກຂໍ້ມູນໂຮງຮຽນ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Academic Setup */}
      {activeTab === 'academic' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* School Years */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              ສົກຮຽນ (School Years)
            </h2>

            <form onSubmit={handleCreateYear} className="flex gap-2">
              <input
                type="text"
                required
                value={newYearName}
                onChange={(e) => setNewYearName(e.target.value)}
                placeholder="2026-2027"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> ເພີ່ມສົກຮຽນ
              </button>
            </form>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {schoolYears.map(y => (
                <div key={y.id} className="p-3 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-800">{y.name}</span>
                  {y.isCurrent && (
                    <span className="text-2xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                      ສົກຮຽນປະຈຸບັນ
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              ຊັ້ນ ແລະ ຫ້ອງຮຽນ (Classes)
            </h2>

            <form onSubmit={handleCreateClass} className="space-y-3 p-3 bg-slate-50 rounded-xl text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">ຊັ້ນ (Grade):</label>
                  <input
                    type="text"
                    required
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    placeholder="ມ.7, ມ.6..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">ຫ້ອງ (Room):</label>
                  <input
                    type="text"
                    required
                    value={newRoom}
                    onChange={(e) => setNewRoom(e.target.value)}
                    placeholder="7/1, 7/2..."
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 mb-1 font-semibold">ຄູປະຈຳຫ້ອງ:</label>
                <input
                  type="text"
                  value={newTeacher}
                  onChange={(e) => setNewTeacher(e.target.value)}
                  placeholder="ອາຈານ ສົມສະນຸກ..."
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> ເພີ່ມຫ້ອງຮຽນ
              </button>
            </form>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {classes.map(c => (
                <div key={c.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-bold text-slate-800">ຫ້ອງ {c.name}</div>
                    <div className="text-xs text-slate-500">ຄູປະຈຳຫ້ອງ: {c.homeroomTeacher || '-'}</div>
                  </div>
                  <button
                    onClick={() => handleDeleteClass(c.id, c.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
