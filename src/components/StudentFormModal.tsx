import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  MapPin,
  Home,
  Users,
  Phone,
  AlertCircle,
  Copy,
  CheckCircle2,
  Calendar,
  Layers
} from 'lucide-react';
import { Student, ClassRoom, SchoolYear } from '../types';
import { validateStudent } from '../services/studentHelper';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Student>) => Promise<void>;
  editingStudent: Student | null;
  classes: ClassRoom[];
  schoolYears: SchoolYear[];
  selectedClassId: string;
  nextAvailableNumber: number;
}

const LAO_PROVINCES = [
  'ນະຄອນຫຼວງວຽງຈັນ',
  'ແຂວງ ວຽງຈັນ',
  'ແຂວງ ຫຼວງພະບາງ',
  'ແຂວງ ຈຳປາສັກ',
  'ແຂວງ ສະຫວັນນະເຂດ',
  'ແຂວງ ຄຳມ່ວນ',
  'ແຂວງ ບໍລິຄຳໄຊ',
  'ແຂວງ ໄຊຍະບູລີ',
  'ແຂວງ ອຸດົມໄຊ',
  'ແຂວງ ຫຼວງນ້ຳທາ',
  'ແຂວງ ບໍ່ແກ້ວ',
  'ແຂວງ ຜົ້ງສາລີ',
  'ແຂວງ ຫົວພັນ',
  'ແຂວງ ຊຽງຂວາງ',
  'ແຂວງ ສາລະວັນ',
  'ແຂວງ ເຊກອງ',
  'ແຂວງ ອັດຕະປື',
  'ແຂວງ ໄຊສົມບູນ'
];

const COMMON_ETHNICITIES = [
  'ລາວ',
  'ມົ້ງ',
  'ຂະມຸ',
  'ໄທດຳ',
  'ໄທຂາວ',
  'ລື້',
  'ພວນ',
  'ຢ້າວ',
  'ອາຂ່າ',
  'ກະຕາງ',
  'ຕາໂອ້ຍ',
  'ບຣູ',
  'ອື່ນໆ'
];

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingStudent,
  classes,
  schoolYears,
  selectedClassId,
  nextAvailableNumber
}) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    studentNumber: nextAvailableNumber,
    prefix: 'ທ້າວ',
    firstName: '',
    lastName: '',
    ethnicity: 'ລາວ',
    dateOfBirth: '2008-01-01',
    birthplace: {
      village: '',
      district: '',
      province: 'ນະຄອນຫຼວງວຽງຈັນ'
    },
    currentAddress: {
      village: '',
      district: '',
      province: 'ນະຄອນຫຼວງວຽງຈັນ'
    },
    father: {
      firstName: '',
      lastName: '',
      occupation: ''
    },
    mother: {
      firstName: '',
      lastName: '',
      occupation: ''
    },
    guardianPhone: '',
    classId: selectedClassId !== 'all' ? selectedClassId : (classes[0]?.id || ''),
    schoolYearId: schoolYears[0]?.id || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  useEffect(() => {
    if (editingStudent) {
      setFormData({
        ...editingStudent,
        studentNumber: editingStudent.studentNumber || editingStudent.rollNumber || nextAvailableNumber,
        prefix: editingStudent.prefix || editingStudent.title || 'ທ້າວ',
        ethnicity: editingStudent.ethnicity || 'ລາວ',
        dateOfBirth: editingStudent.dateOfBirth || editingStudent.dob || '2008-01-01',
        birthplace: {
          village: editingStudent.birthplace?.village || editingStudent.village || '',
          district: editingStudent.birthplace?.district || editingStudent.district || '',
          province: editingStudent.birthplace?.province || editingStudent.province || 'ນະຄອນຫຼວງວຽງຈັນ'
        },
        currentAddress: {
          village: editingStudent.currentAddress?.village || editingStudent.village || '',
          district: editingStudent.currentAddress?.district || editingStudent.district || '',
          province: editingStudent.currentAddress?.province || editingStudent.province || 'ນະຄອນຫຼວງວຽງຈັນ'
        },
        father: {
          firstName: editingStudent.father?.firstName || (editingStudent.fatherInfo?.split(' ')[0] || ''),
          lastName: editingStudent.father?.lastName || (editingStudent.fatherInfo?.split(' ').slice(1).join(' ') || ''),
          occupation: editingStudent.father?.occupation || editingStudent.guardianOccupation || ''
        },
        mother: {
          firstName: editingStudent.mother?.firstName || (editingStudent.motherInfo?.split(' ')[0] || ''),
          lastName: editingStudent.mother?.lastName || (editingStudent.motherInfo?.split(' ').slice(1).join(' ') || ''),
          occupation: editingStudent.mother?.occupation || ''
        },
        guardianPhone: editingStudent.guardianPhone || editingStudent.phone || '',
        classId: editingStudent.classId || (selectedClassId !== 'all' ? selectedClassId : (classes[0]?.id || '')),
        schoolYearId: editingStudent.schoolYearId || (schoolYears[0]?.id || '')
      });
    } else {
      setFormData({
        studentNumber: nextAvailableNumber,
        prefix: 'ທ້າວ',
        firstName: '',
        lastName: '',
        ethnicity: 'ລາວ',
        dateOfBirth: '2008-01-01',
        birthplace: {
          village: '',
          district: '',
          province: 'ນະຄອນຫຼວງວຽງຈັນ'
        },
        currentAddress: {
          village: '',
          district: '',
          province: 'ນະຄອນຫຼວງວຽງຈັນ'
        },
        father: {
          firstName: '',
          lastName: '',
          occupation: ''
        },
        mother: {
          firstName: '',
          lastName: '',
          occupation: ''
        },
        guardianPhone: '',
        classId: selectedClassId !== 'all' ? selectedClassId : (classes[0]?.id || ''),
        schoolYearId: schoolYears[0]?.id || ''
      });
    }
    setErrors({});
  }, [editingStudent, isOpen, nextAvailableNumber, selectedClassId, classes, schoolYears]);

  if (!isOpen) return null;

  // Copy birthplace values to currentAddress
  const handleCopyBirthplace = () => {
    setFormData(prev => ({
      ...prev,
      currentAddress: {
        village: prev.birthplace?.village || '',
        district: prev.birthplace?.district || '',
        province: prev.birthplace?.province || 'ນະຄອນຫຼວງວຽງຈັນ'
      }
    }));
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateStudent(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກຂໍ້ມູນນັກຮຽນ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-lao animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-bold">
              {formData.studentNumber || '#'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingStudent ? 'ແກ້ໄຂຂໍ້ມູນນັກຮຽນ' : 'ເພີ່ມນັກຮຽນໃໝ່ (Add Student)'}
              </h2>
              <p className="text-xs text-slate-300">
                ກະລຸນາປ້ອນຂໍ້ມູນຕາມ 6 ພາກສ່ວນຫຼັກຂອງລະບົບ Student Database
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/40">
          {/* Class & Academic Year Selectors */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>ຫ້ອງຮຽນ (Class) *</span>
              </label>
              <select
                value={formData.classId || ''}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>ສົກຮຽນ (School Year) *</span>
              </label>
              <select
                value={formData.schoolYearId || ''}
                onChange={(e) => setFormData({ ...formData, schoolYearId: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {schoolYears.map(y => (
                  <option key={y.id} value={y.id}>
                    ສົກຮຽນ {y.name} {y.isCurrent ? '(ປະຈຸບັນ)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ========================================================
              SECTION A: ຂໍ້ມູນນັກຮຽນ (Student Core Information)
              Required: studentNumber, prefix, firstName, lastName, dateOfBirth
             ======================================================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">
                  A
                </span>
                <span>ຂໍ້ມູນນັກຮຽນ (Student Information)</span>
              </h3>
              <span className="text-2xs text-rose-500 font-semibold">* ຂໍ້ມູນຈຳເປັນ</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* 1. ລຳດັບ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. ລຳດັບ (ເລກທີ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.studentNumber || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setFormData({ ...formData, studentNumber: val, rollNumber: val });
                    if (errors.studentNumber) setErrors({ ...errors, studentNumber: '' });
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.studentNumber ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {errors.studentNumber && (
                  <p className="text-2xs text-rose-600 mt-1">{errors.studentNumber}</p>
                )}
              </div>

              {/* 2. ຄຳນຳໜ້າ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. ຄຳນຳໜ້າ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.prefix || 'ທ້າວ'}
                  onChange={(e) => {
                    const p = e.target.value;
                    setFormData({ ...formData, prefix: p, title: p });
                    if (errors.prefix) setErrors({ ...errors, prefix: '' });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ທ້າວ">ທ້າວ</option>
                  <option value="ນາງ">ນາງ</option>
                  <option value="ສ.ພ">ສ.ພ (ສາມະເນນ)</option>
                  <option value="ພຣະ">ພຣະ</option>
                </select>
              </div>

              {/* 3. ຊົນເຜົ່າ */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  5. ຊົນເຜົ່າ (Ethnicity)
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={formData.ethnicity || 'ລາວ'}
                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                    className="w-1/2 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {COMMON_ETHNICITIES.map(eth => (
                      <option key={eth} value={eth}>{eth}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={formData.ethnicity || ''}
                    onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                    placeholder="ລະບຸຊົນເຜົ່າ..."
                    className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 4. ຊື່ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. ຊື່ (First Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, firstName: e.target.value });
                    if (errors.firstName) setErrors({ ...errors, firstName: '' });
                  }}
                  placeholder="ຕົວຢ່າງ: ບຸນມີ"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.firstName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {errors.firstName && (
                  <p className="text-2xs text-rose-600 mt-1">{errors.firstName}</p>
                )}
              </div>

              {/* 5. ນາມສະກຸນ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  4. ນາມສະກຸນ (Last Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, lastName: e.target.value });
                    if (errors.lastName) setErrors({ ...errors, lastName: '' });
                  }}
                  placeholder="ຕົວຢ່າງ: ສີສຸວັນ"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.lastName ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {errors.lastName && (
                  <p className="text-2xs text-rose-600 mt-1">{errors.lastName}</p>
                )}
              </div>

              {/* 6. ວັນເກີດ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  6. ວັນເດືອນປີເກີດ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.dateOfBirth || formData.dob || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, dateOfBirth: e.target.value, dob: e.target.value });
                    if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.dateOfBirth ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {errors.dateOfBirth && (
                  <p className="text-2xs text-rose-600 mt-1">{errors.dateOfBirth}</p>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION B: ຂໍ້ມູນບ່ອນເກີດ (Birthplace)
              Required: village, district, province
             ======================================================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                  B
                </span>
                <span>ຂໍ້ມູນບ່ອນເກີດ (Place of Birth)</span>
              </h3>
              <span className="text-2xs text-rose-500 font-semibold">* ຈຳເປັນທັງ 3 ຟິວ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 7. ບ້ານເກີດ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  7. ບ້ານເກີດ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.birthplace?.village || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      birthplace: {
                        village: e.target.value,
                        district: formData.birthplace?.district || '',
                        province: formData.birthplace?.province || 'ນະຄອນຫຼວງວຽງຈັນ'
                      }
                    });
                    if (errors['birthplace.village']) {
                      const nextErr = { ...errors };
                      delete nextErr['birthplace.village'];
                      setErrors(nextErr);
                    }
                  }}
                  placeholder="ເຊັ່ນ: ບ້ານ ໜອງທາເໜືອ"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['birthplace.village'] ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {errors['birthplace.village'] && (
                  <p className="text-2xs text-rose-600 mt-1">{errors['birthplace.village']}</p>
                )}
              </div>

              {/* 8. ເມືອງເກີດ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  8. ເມືອງເກີດ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.birthplace?.district || ''}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      birthplace: {
                        village: formData.birthplace?.village || '',
                        district: e.target.value,
                        province: formData.birthplace?.province || 'ນະຄອນຫຼວງວຽງຈັນ'
                      }
                    });
                    if (errors['birthplace.district']) {
                      const nextErr = { ...errors };
                      delete nextErr['birthplace.district'];
                      setErrors(nextErr);
                    }
                  }}
                  placeholder="ເຊັ່ນ: ຈັນທະບູລີ"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors['birthplace.district'] ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                  }`}
                />
                {errors['birthplace.district'] && (
                  <p className="text-2xs text-rose-600 mt-1">{errors['birthplace.district']}</p>
                )}
              </div>

              {/* 9. ແຂວງເກີດ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  9. ແຂວງເກີດ <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.birthplace?.province || 'ນະຄອນຫຼວງວຽງຈັນ'}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      birthplace: {
                        village: formData.birthplace?.village || '',
                        district: formData.birthplace?.district || '',
                        province: e.target.value
                      }
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LAO_PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION C: ຂໍ້ມູນທີ່ຢູ່ປັດຈຸບັນ (Current Address)
             ======================================================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                  C
                </span>
                <span>ຂໍ້ມູນທີ່ຢູ່ປັດຈຸບັນ (Current Address)</span>
              </h3>
              <button
                type="button"
                onClick={handleCopyBirthplace}
                className="px-2.5 py-1 text-2xs rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium flex items-center gap-1 transition"
                title="ຄັດລອກບ້ານ/ເມືອງ/ແຂວງ ຈາກບ່ອນເກີດ"
              >
                {copiedAddress ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedAddress ? 'ຄັດລອກແລ້ວ' : 'ຄືກັນກັບບ່ອນເກີດ'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 10. ບ້ານຢູ່ປັດຈຸບັນ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  10. ບ້ານຢູ່ປັດຈຸບັນ
                </label>
                <input
                  type="text"
                  value={formData.currentAddress?.village || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    currentAddress: {
                      village: e.target.value,
                      district: formData.currentAddress?.district || '',
                      province: formData.currentAddress?.province || 'ນະຄອນຫຼວງວຽງຈັນ'
                    }
                  })}
                  placeholder="ເຊັ່ນ: ບ້ານ ໜອງທາເໜືອ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 11. ເມືອງຢູ່ປັດຈຸບັນ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  11. ເມືອງຢູ່ປັດຈຸບັນ
                </label>
                <input
                  type="text"
                  value={formData.currentAddress?.district || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    currentAddress: {
                      village: formData.currentAddress?.village || '',
                      district: e.target.value,
                      province: formData.currentAddress?.province || 'ນະຄອນຫຼວງວຽງຈັນ'
                    }
                  })}
                  placeholder="ເຊັ່ນ: ຈັນທະບູລີ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 12. ແຂວງຢູ່ປັດຈຸບັນ */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  12. ແຂວງຢູ່ປັດຈຸບັນ
                </label>
                <select
                  value={formData.currentAddress?.province || 'ນະຄອນຫຼວງວຽງຈັນ'}
                  onChange={(e) => setFormData({
                    ...formData,
                    currentAddress: {
                      village: formData.currentAddress?.village || '',
                      district: formData.currentAddress?.district || '',
                      province: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {LAO_PROVINCES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION D & E: ຂໍ້ມູນພໍ່ ແລະ ຂໍ້ມູນແມ່ (Parents Info)
             ======================================================== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* D. ຂໍ້ມູນພໍ່ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold flex items-center justify-center">
                    D
                  </span>
                  <span>ຂໍ້ມູນພໍ່ (Father Information)</span>
                </h3>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">13. ຊື່ພໍ່</label>
                <input
                  type="text"
                  value={formData.father?.firstName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: {
                      firstName: e.target.value,
                      lastName: formData.father?.lastName || '',
                      occupation: formData.father?.occupation || ''
                    }
                  })}
                  placeholder="ຊື່ພໍ່"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">14. ນາມສະກຸນພໍ່</label>
                <input
                  type="text"
                  value={formData.father?.lastName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: {
                      firstName: formData.father?.firstName || '',
                      lastName: e.target.value,
                      occupation: formData.father?.occupation || ''
                    }
                  })}
                  placeholder="ນາມສະກຸນພໍ່"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">15. ອາຊີບພໍ່</label>
                <input
                  type="text"
                  value={formData.father?.occupation || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    father: {
                      firstName: formData.father?.firstName || '',
                      lastName: formData.father?.lastName || '',
                      occupation: e.target.value
                    }
                  })}
                  placeholder="ເຊັ່ນ: ພະນັກງານລັດ, ຄ້າຂາຍ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* E. ຂໍ້ມູນແມ່ */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-pink-100 text-pink-800 text-xs font-bold flex items-center justify-center">
                    E
                  </span>
                  <span>ຂໍ້ມູນແມ່ (Mother Information)</span>
                </h3>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">16. ຊື່ແມ່</label>
                <input
                  type="text"
                  value={formData.mother?.firstName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    mother: {
                      firstName: e.target.value,
                      lastName: formData.mother?.lastName || '',
                      occupation: formData.mother?.occupation || ''
                    }
                  })}
                  placeholder="ຊື່ແມ່"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">17. ນາມສະກຸນແມ່</label>
                <input
                  type="text"
                  value={formData.mother?.lastName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    mother: {
                      firstName: formData.mother?.firstName || '',
                      lastName: e.target.value,
                      occupation: formData.mother?.occupation || ''
                    }
                  })}
                  placeholder="ນາມສະກຸນແມ່"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">18. ອາຊີບແມ່</label>
                <input
                  type="text"
                  value={formData.mother?.occupation || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    mother: {
                      firstName: formData.mother?.firstName || '',
                      lastName: formData.mother?.lastName || '',
                      occupation: e.target.value
                    }
                  })}
                  placeholder="ເຊັ່ນ: ຊາວກະສິກອນ, ທຸລະກິດ"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          {/* ========================================================
              SECTION F: ຂໍ້ມູນຜູ້ປົກຄອງ (Guardian Phone)
             ======================================================== */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 text-xs font-bold flex items-center justify-center">
                  F
                </span>
                <span>ຂໍ້ມູນຜູ້ປົກຄອງ (Guardian Contact)</span>
              </h3>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-teal-600" />
                <span>19. ເບີໂທຜູ້ປົກຄອງ (Guardian Phone)</span>
              </label>
              <input
                type="text"
                value={formData.guardianPhone || formData.phone || ''}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    guardianPhone: e.target.value,
                    phone: e.target.value
                  });
                  if (errors.guardianPhone) {
                    const nextErr = { ...errors };
                    delete nextErr.guardianPhone;
                    setErrors(nextErr);
                  }
                }}
                placeholder="020 55xxxxxx ຫຼື +856 20 55xxxxxx (ເກັບເປັນ string ຫ້າມຕັດ 0)"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.guardianPhone ? 'border-rose-400 bg-rose-50/40' : 'border-slate-200'
                }`}
              />
              <p className="text-2xs text-slate-400 mt-1">
                * ຮອງຮັບເບີໂທທຸກຮູບແບບ: 020..., 030..., +856... ລະບົບເກັບຮັກສາເລກ 0 ຕົວໜ້າໄວ້ສະເໝີ
              </p>
              {errors.guardianPhone && (
                <p className="text-2xs text-rose-600 mt-1">{errors.guardianPhone}</p>
              )}
            </div>
          </div>

          {/* Optional Notes */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ໝາຍເຫດເພີ່ມເຕີມ (Notes)
            </label>
            <input
              type="text"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="ເຊັ່ນ: ຫົວໜ້າຫ້ອງ, ນັກຮຽນເກັ່ງ..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Validation Summary if any error */}
          {Object.keys(errors).length > 0 && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="block font-bold">ກະລຸນາກວດສອບຂໍ້ມູນທີ່ຍັງບໍ່ຄົບຖ້ວນ:</strong>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-2xs">
                  {Object.values(errors).map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5 sticky bottom-0 bg-white/95 backdrop-blur-xs py-3 px-1 -mx-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              ຍົກເລີກ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'ກຳລັງບັນທຶກ...' : (editingStudent ? 'ບັນທຶກການແກ້ໄຂ' : 'ບັນທຶກນັກຮຽນ')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
