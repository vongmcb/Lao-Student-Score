import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  AlertCircle,
  Users,
  Check,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Student, ClassRoom, SchoolYear } from '../types';
import {
  parseExcelFile,
  ExcelImportResult,
  ExcelImportRow,
  downloadExcelTemplate,
  EXCEL_COLUMNS
} from '../services/studentHelper';

interface StudentExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  onBatchSave: (students: Partial<Student>[]) => Promise<number>;
  existingStudents: Student[];
  classes: ClassRoom[];
  schoolYears: SchoolYear[];
  selectedClassId: string;
}

export const StudentExcelImportModal: React.FC<StudentExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  onBatchSave,
  existingStudents,
  classes,
  schoolYears,
  selectedClassId
}) => {
  const [targetClassId, setTargetClassId] = useState<string>(
    selectedClassId !== 'all' ? selectedClassId : (classes[0]?.id || '')
  );
  const [targetSchoolYearId, setTargetSchoolYearId] = useState<string>(
    schoolYears[0]?.id || ''
  );

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ExcelImportResult | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'valid' | 'error'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsParsing(true);
    setParseResult(null);
    setConfirmed(false);

    try {
      const result = await parseExcelFile(
        selectedFile,
        existingStudents,
        targetClassId,
        targetSchoolYearId
      );
      setParseResult(result);
      if (result.errorRows.length > 0) {
        setSelectedTab('all');
      } else {
        setSelectedTab('valid');
      }
    } catch (err) {
      console.error(err);
      alert('ບໍ່ສາມາດອ່ານໄຟລ໌ Excel ໄດ້ ກະລຸນາກວດສອບຮູບແບບໄຟລ໌');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!parseResult || parseResult.validRows.length === 0) return;
    setIsImporting(true);
    try {
      const studentsToSave = parseResult.validRows.map(r => ({
        ...r.data,
        classId: targetClassId,
        schoolYearId: targetSchoolYearId
      }));

      const count = await onBatchSave(studentsToSave);
      onImportSuccess(count);
      onClose();
    } catch (err) {
      console.error(err);
      alert('ເກີດຂໍ້ຜິດພາດໃນການບັນທຶກລາຍຊື່ເຂົ້າ Firebase');
    } finally {
      setIsImporting(false);
    }
  };

  const currentClass = classes.find(c => c.id === targetClassId);

  const displayedRows: ExcelImportRow[] = parseResult
    ? selectedTab === 'valid'
      ? parseResult.validRows
      : selectedTab === 'error'
      ? parseResult.errorRows
      : [...parseResult.validRows, ...parseResult.errorRows].sort((a, b) => a.rowIndex - b.rowIndex)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-lao animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                ນຳເຂົ້າລາຍຊື່ນັກຮຽນຈາກ Excel (.xlsx / .csv)
              </h2>
              <p className="text-xs text-slate-300">
                ກວດສອບຖັນຂໍ້ມູນ, ກວດ Duplicate, ສະແດງແຖວຜິດພາດ ແລະ ຢືນຢັນກ່ອນບັນທຶກ
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

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-slate-50/50">
          {/* Step 1: Target Classroom and Template Download */}
          <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">
                  1. ເລືອກຫ້ອງຮຽນເປົ້າໝາຍ *
                </label>
                <select
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-blue-900"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      ຫ້ອງ {c.name} ({c.grade})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">
                  2. ສົກຮຽນ *
                </label>
                <select
                  value={targetSchoolYearId}
                  onChange={(e) => setTargetSchoolYearId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                >
                  {schoolYears.map(y => (
                    <option key={y.id} value={y.id}>
                      ສົກຮຽນ {y.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center">
              <button
                type="button"
                onClick={downloadExcelTemplate}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
                title="ດາວໂຫຼດຟອມ Excel 19 ຖັນພ້ອມຕົວຢ່າງ"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>ດາວໂຫຼດຟອມຕົວຢ່າງ Excel</span>
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-blue-200 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60 rounded-3xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-700 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {file ? file.name : 'ກົດເພື່ອເລືອກໄຟລ໌ Excel (.xlsx, .xls, .csv)'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'ຫຼື ລາກໄຟລ໌ມາໃສ່ນີ້ (ຮອງຮັບມາດຕະຖານ 19 ຖັນ)'}
              </p>
            </div>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>ກຳລັງກວດສອບ ແລະ ວິເຄາະໂຄງສ້າງ Excel...</span>
            </div>
          )}

          {/* Parse Results Preview */}
          {parseResult && !isParsing && (
            <div className="space-y-4">
              {/* Column Warnings */}
              {parseResult.columnErrors.length > 0 && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold">ກວດພົບຂໍ້ຜິດພາດຂອງຖັນຂໍ້ມູນ (Columns Issue):</h4>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-2xs text-amber-800">
                      {parseResult.columnErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Statistics & Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTab('all')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedTab === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>ທັງໝົດ ({parseResult.totalRows})</span>
                  </button>

                  <button
                    onClick={() => setSelectedTab('valid')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedTab === 'valid'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ຂໍ້ມູນຖືກຕ້ອງ ({parseResult.validRows.length})</span>
                  </button>

                  <button
                    onClick={() => setSelectedTab('error')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      selectedTab === 'error'
                        ? 'bg-rose-700 text-white'
                        : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>ແຖວມີຂໍ້ຜິດພາດ ({parseResult.errorRows.length})</span>
                  </button>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  ຫ້ອງຮຽນ: <strong className="text-blue-900">{currentClass?.name}</strong>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto max-h-72 custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-slate-600 font-bold sticky top-0 z-10 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 whitespace-nowrap">ແຖວ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ສະຖານະ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ລຳດັບ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ຊື່ ແລະ ນາມສະກຸນ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ຊົນເຜົ່າ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ວັນເກີດ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ບ່ອນເກີດ (ບ້ານ, ເມືອງ, ແຂວງ)</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ທີ່ຢູ່ປັດຈຸບັນ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ພໍ່ / ແມ່</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ເບີໂທ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">ລາຍລະອຽດຂໍ້ຜິດພາດ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-2xs">
                      {displayedRows.length === 0 ? (
                        <tr>
                          <td colSpan={11} className="py-8 text-center text-slate-400">
                            ບໍ່ມີຂໍ້ມູນໃນໝວດນີ້
                          </td>
                        </tr>
                      ) : (
                        displayedRows.map((row, idx) => {
                          const d = row.data;
                          return (
                            <tr
                              key={idx}
                              className={
                                !row.isValid
                                  ? 'bg-rose-50/50 hover:bg-rose-50 transition'
                                  : 'hover:bg-slate-50 transition'
                              }
                            >
                              <td className="py-2 px-3 font-mono font-bold text-slate-500">
                                #{row.rowIndex}
                              </td>
                              <td className="py-2 px-3 whitespace-nowrap">
                                {row.isValid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-3xs">
                                    <Check className="w-2.5 h-2.5" /> ພ້ອມນຳເຂົ້າ
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-3xs">
                                    <AlertCircle className="w-2.5 h-2.5" /> ຜິດພາດ
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-bold text-blue-900 font-mono">
                                {d.studentNumber || '-'}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                                {d.prefix} {d.firstName} {d.lastName}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {d.ethnicity || 'ລາວ'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 font-mono whitespace-nowrap">
                                {d.dateOfBirth || '-'}
                              </td>
                              <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                                {d.birthplace?.village}, {d.birthplace?.district}, {d.birthplace?.province}
                              </td>
                              <td className="py-2 px-3 text-slate-600 max-w-xs truncate">
                                {d.currentAddress?.village}, {d.currentAddress?.district}
                              </td>
                              <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                                {d.father?.firstName ? `ພໍ່: ${d.father.firstName}` : ''}{' '}
                                {d.mother?.firstName ? `ແມ່: ${d.mother.firstName}` : ''}
                              </td>
                              <td className="py-2 px-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                                {d.guardianPhone || '-'}
                              </td>
                              <td className="py-2 px-3 text-rose-600 font-semibold max-w-xs">
                                {row.errors.length > 0 ? row.errors.join(' | ') : '—'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 3: User Confirmation Checkbox */}
              {parseResult.validRows.length > 0 && (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="confirm-import"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="confirm-import" className="text-xs text-slate-800 cursor-pointer">
                    <strong className="block font-bold text-blue-950 mb-0.5">
                      ຂ້າພະເຈົ້າໄດ້ກວດສອບ ແລະ ຢືນຢັນນຳເຂົ້າຂໍ້ມູນ {parseResult.validRows.length} ຄົນ ເຂົ້າຫ້ອງ {currentClass?.name}
                    </strong>
                    <span>
                      (ແຖວທີ່ຜິດພາດ {parseResult.errorRows.length} ແຖວ ຈະຖືກຂ້າມ ແລະ ບໍ່ຖືກບັນທຶກເຂົ້າລະບົບ)
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            ຍົກເລີກ
          </button>

          <div className="flex items-center gap-2">
            {parseResult && parseResult.validRows.length > 0 && (
              <button
                type="button"
                disabled={!confirmed || isImporting}
                onClick={handleConfirmImport}
                className="px-6 py-2.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-40 rounded-xl transition shadow-md flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>ກຳລັງນຳເຂົ້າສູ່ Firebase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>ຢືນຢັນນຳເຂົ້າ ({parseResult.validRows.length} ຄົນ)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
