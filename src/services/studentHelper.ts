import { Student, AddressInfo, ParentInfo } from '../types';
import * as XLSX from 'xlsx';

/**
 * Normalizes raw Firestore student data into a unified Student object,
 * ensuring all new fields and backwards-compatibility aliases are populated.
 */
export function normalizeStudent(data: any, id: string): Student {
  const studentNumber = Number(data.studentNumber ?? data.rollNumber ?? 1);
  const prefix = String(data.prefix ?? data.title ?? 'ທ້າວ').trim();
  const firstName = String(data.firstName ?? '').trim();
  const lastName = String(data.lastName ?? '').trim();
  const ethnicity = String(data.ethnicity ?? 'ລາວ').trim();
  const dateOfBirth = String(data.dateOfBirth ?? data.dob ?? '2008-01-01').trim();

  // Birthplace
  const birthplace: AddressInfo = {
    village: String(data.birthplace?.village ?? data.village ?? '').trim(),
    district: String(data.birthplace?.district ?? data.district ?? '').trim(),
    province: String(data.birthplace?.province ?? data.province ?? 'ນະຄອນຫຼວງວຽງຈັນ').trim()
  };

  // Current Address
  const currentAddress: AddressInfo = {
    village: String(data.currentAddress?.village ?? data.village ?? '').trim(),
    district: String(data.currentAddress?.district ?? data.district ?? '').trim(),
    province: String(data.currentAddress?.province ?? data.province ?? 'ນະຄອນຫຼວງວຽງຈັນ').trim()
  };

  // Father info
  const father: ParentInfo = {
    firstName: String(data.father?.firstName ?? (data.fatherInfo ? data.fatherInfo.split(' ')[0] : '')).trim(),
    lastName: String(data.father?.lastName ?? (data.fatherInfo ? data.fatherInfo.split(' ').slice(1).join(' ') : '')).trim(),
    occupation: String(data.father?.occupation ?? data.guardianOccupation ?? '').trim()
  };

  // Mother info
  const mother: ParentInfo = {
    firstName: String(data.mother?.firstName ?? (data.motherInfo ? data.motherInfo.split(' ')[0] : '')).trim(),
    lastName: String(data.mother?.lastName ?? (data.motherInfo ? data.motherInfo.split(' ').slice(1).join(' ') : '')).trim(),
    occupation: String(data.mother?.occupation ?? '').trim()
  };

  // Guardian Phone: keep as string, preserve leading 0, support +856
  const guardianPhone = String(data.guardianPhone ?? data.phone ?? '').trim();

  // Inferred gender
  const gender: 'male' | 'female' = data.gender ?? (prefix.includes('ນາງ') ? 'female' : 'male');

  const studentId = data.studentId || `ST-${String(studentNumber).padStart(4, '0')}`;

  const fatherInfo = father.firstName
    ? `${father.firstName} ${father.lastName}${father.occupation ? ` (${father.occupation})` : ''}`.trim()
    : (data.fatherInfo || '');

  const motherInfo = mother.firstName
    ? `${mother.firstName} ${mother.lastName}${mother.occupation ? ` (${mother.occupation})` : ''}`.trim()
    : (data.motherInfo || '');

  const guardianOccupation = father.occupation || mother.occupation || data.guardianOccupation || '';

  return {
    id,
    studentNumber,
    prefix,
    firstName,
    lastName,
    ethnicity: ethnicity || 'ລາວ',
    dateOfBirth,
    birthplace,
    currentAddress,
    father,
    mother,
    guardianPhone,
    classId: data.classId || '',
    schoolYearId: data.schoolYearId || '',
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    createdBy: data.createdBy,

    // Aliases
    rollNumber: studentNumber,
    title: prefix,
    dob: dateOfBirth,
    studentId,
    gender,
    village: currentAddress.village || birthplace.village,
    district: currentAddress.district || birthplace.district,
    province: currentAddress.province || birthplace.province,
    phone: guardianPhone,
    fatherInfo,
    motherInfo,
    guardianOccupation,
    notes: data.notes || ''
  };
}

/**
 * Prepares a Student object for Firestore according to Section 7:
 * {
 *   studentNumber: number,
 *   prefix: string,
 *   firstName: string,
 *   lastName: string,
 *   ethnicity: string,
 *   dateOfBirth: string,
 *   birthplace: { village, district, province },
 *   currentAddress: { village, district, province },
 *   father: { firstName, lastName, occupation },
 *   mother: { firstName, lastName, occupation },
 *   guardianPhone: string,
 *   classId: string,
 *   schoolYearId: string,
 *   createdAt: ...,
 *   updatedAt: ...,
 *   createdBy: string
 * }
 */
export function prepareStudentPayload(formData: Partial<Student>, userEmail?: string, isCreate: boolean = false) {
  const studentNumber = Number(formData.studentNumber ?? formData.rollNumber ?? 1);
  const prefix = String(formData.prefix ?? formData.title ?? 'ທ້າວ').trim();
  const firstName = String(formData.firstName ?? '').trim();
  const lastName = String(formData.lastName ?? '').trim();
  const ethnicity = String(formData.ethnicity ?? 'ລາວ').trim() || 'ລາວ';
  const dateOfBirth = String(formData.dateOfBirth ?? formData.dob ?? '').trim();

  const birthplace = {
    village: String(formData.birthplace?.village ?? formData.village ?? '').trim(),
    district: String(formData.birthplace?.district ?? formData.district ?? '').trim(),
    province: String(formData.birthplace?.province ?? formData.province ?? '').trim()
  };

  const currentAddress = {
    village: String(formData.currentAddress?.village ?? formData.village ?? '').trim(),
    district: String(formData.currentAddress?.district ?? formData.district ?? '').trim(),
    province: String(formData.currentAddress?.province ?? formData.province ?? '').trim()
  };

  const father = {
    firstName: String(formData.father?.firstName ?? '').trim(),
    lastName: String(formData.father?.lastName ?? '').trim(),
    occupation: String(formData.father?.occupation ?? '').trim()
  };

  const mother = {
    firstName: String(formData.mother?.firstName ?? '').trim(),
    lastName: String(formData.mother?.lastName ?? '').trim(),
    occupation: String(formData.mother?.occupation ?? '').trim()
  };

  // Phone: MUST be stored as string, never number, preserve leading 0, support +856
  const rawPhone = String(formData.guardianPhone ?? formData.phone ?? '').trim();
  const guardianPhone = cleanPhoneNumber(rawPhone);

  const payload: any = {
    studentNumber,
    prefix,
    firstName,
    lastName,
    ethnicity,
    dateOfBirth,
    birthplace,
    currentAddress,
    father,
    mother,
    guardianPhone,
    classId: formData.classId || '',
    schoolYearId: formData.schoolYearId || '',
    updatedAt: new Date().toISOString()
  };

  // Also include studentId and rollNumber for backward compatibility
  payload.rollNumber = studentNumber;
  payload.title = prefix;
  payload.dob = dateOfBirth;
  payload.studentId = formData.studentId || `ST-${String(studentNumber).padStart(4, '0')}`;
  payload.gender = prefix.includes('ນາງ') ? 'female' : 'male';
  payload.phone = guardianPhone;

  if (formData.notes !== undefined) {
    payload.notes = formData.notes;
  }

  if (isCreate) {
    payload.createdAt = new Date().toISOString();
    payload.createdBy = userEmail || 'user';
  }

  return payload;
}

/**
 * Phone number cleaner:
 * - Keeps string
 * - Keeps leading 0 (e.g. "020 55112233" or "02055112233")
 * - Keeps +856 if present
 */
export function cleanPhoneNumber(phoneStr: string): string {
  if (!phoneStr) return '';
  // Normalize whitespace
  return phoneStr.replace(/\s+/g, ' ').trim();
}

/**
 * Validation according to Section 9:
 * Required:
 * - ລຳດັບ (studentNumber)
 * - ຄຳນຳໜ້າ (prefix)
 * - ຊື່ (firstName)
 * - ນາມສະກຸນ (lastName)
 * - ວັນເກີດ (dateOfBirth)
 * - ບ້ານເກີດ (birthplace.village)
 * - ເມືອງເກີດ (birthplace.district)
 * - ແຂວງເກີດ (birthplace.province)
 *
 * Optional:
 * - ຂໍ້ມູນພໍ່/ແມ່
 * - ເບີໂທ
 */
export interface StudentValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateStudent(data: Partial<Student>): StudentValidationResult {
  const errors: Record<string, string> = {};

  const studentNumber = data.studentNumber ?? data.rollNumber;
  if (!studentNumber || isNaN(Number(studentNumber)) || Number(studentNumber) <= 0) {
    errors.studentNumber = 'ກະລຸນາປ້ອນລຳດັບ (ເລກທີ) ທີ່ຖືກຕ້ອງ';
  }

  if (!data.prefix && !data.title) {
    errors.prefix = 'ກະລຸນາເລືອກ ຫຼື ປ້ອນຄຳນຳໜ້າ (ເຊັ່ນ: ທ້າວ, ນາງ)';
  }

  if (!data.firstName?.trim()) {
    errors.firstName = 'ກະລຸນາປ້ອນຊື່';
  }

  if (!data.lastName?.trim()) {
    errors.lastName = 'ກະລຸນາປ້ອນນາມສະກຸນ';
  }

  const dob = data.dateOfBirth ?? data.dob;
  if (!dob?.trim()) {
    errors.dateOfBirth = 'ກະລຸນາປ້ອນ ຫຼື ເລືອກວັນເດືອນປີເກີດ';
  }

  if (!data.birthplace?.village?.trim() && !data.village?.trim()) {
    errors['birthplace.village'] = 'ກະລຸນາປ້ອນບ້ານເກີດ';
  }

  if (!data.birthplace?.district?.trim() && !data.district?.trim()) {
    errors['birthplace.district'] = 'ກະລຸນາປ້ອນເມືອງເກີດ';
  }

  if (!data.birthplace?.province?.trim() && !data.province?.trim()) {
    errors['birthplace.province'] = 'ກະລຸນາປ້ອນແຂວງເກີດ';
  }

  // Validate phone format if provided
  const phone = data.guardianPhone ?? data.phone;
  if (phone && phone.trim()) {
    const cleaned = phone.replace(/[\s\-()]/g, '');
    // Check if phone matches common Lao patterns: 020..., 030..., +85620..., +85630..., or general phone
    const isValidPhone = /^(\+856|0)[0-9]{7,12}$/.test(cleaned);
    if (!isValidPhone) {
      errors.guardianPhone = 'ເບີໂທບໍ່ຖືກຕ້ອງຕາມຮູບແບບ (ຕົວຢ່າງ: 020 55xxxxxx ຫຼື +856 20...)';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Section 10: Search Student
 * Can search by:
 * - ລຳດັບ (studentNumber / rollNumber)
 * - ຊື່ (firstName)
 * - ນາມສະກຸນ (lastName)
 * - ຊື່ + ນາມສະກຸນ (prefix firstName lastName)
 * - ຊົນເຜົ່າ (ethnicity)
 * - ບ້ານເກີດ (birthplace.village)
 * - ບ້ານປັດຈຸບັນ (currentAddress.village)
 */
export function studentMatchesSearch(student: Student, term: string): boolean {
  if (!term || !term.trim()) return true;
  const q = term.trim().toLowerCase();

  const numStr = String(student.studentNumber ?? student.rollNumber ?? '');
  const idStr = (student.studentId || '').toLowerCase();
  const firstName = (student.firstName || '').toLowerCase();
  const lastName = (student.lastName || '').toLowerCase();
  const fullName = `${student.prefix || student.title || ''} ${firstName} ${lastName}`.toLowerCase();
  const ethnicity = (student.ethnicity || '').toLowerCase();
  const birthVillage = (student.birthplace?.village || '').toLowerCase();
  const curVillage = (student.currentAddress?.village || student.village || '').toLowerCase();
  const phone = (student.guardianPhone || student.phone || '').toLowerCase();

  return (
    numStr === q ||
    numStr.includes(q) ||
    idStr.includes(q) ||
    firstName.includes(q) ||
    lastName.includes(q) ||
    fullName.includes(q) ||
    ethnicity.includes(q) ||
    birthVillage.includes(q) ||
    curVillage.includes(q) ||
    phone.includes(q)
  );
}

// 19 Standard Excel Columns specified in Requirement 13
export const EXCEL_COLUMNS = [
  'ລຳດັບ',
  'ຄຳນຳໜ້າ',
  'ຊື່',
  'ນາມສະກຸນ',
  'ຊົນເຜົ່າ',
  'ວັນເກີດ',
  'ບ້ານເກີດ',
  'ເມືອງເກີດ',
  'ແຂວງເກີດ',
  'ບ້ານຢູ່ປັດຈຸບັນ',
  'ເມືອງຢູ່ປັດຈຸບັນ',
  'ແຂວງຢູ່ປັດຈຸບັນ',
  'ຊື່ພໍ່',
  'ນາມສະກຸນພໍ່',
  'ອາຊີບພໍ່',
  'ຊື່ແມ່',
  'ນາມສະກຸນແມ່',
  'ອາຊີບແມ່',
  'ເບີໂທຜູ້ປົກຄອງ'
] as const;

export interface ExcelImportRow {
  rowIndex: number;
  data: Partial<Student>;
  isValid: boolean;
  errors: string[];
  isDuplicate: boolean;
  duplicateReason?: string;
  raw: Record<string, any>;
}

export interface ExcelImportResult {
  totalRows: number;
  validRows: ExcelImportRow[];
  errorRows: ExcelImportRow[];
  columnErrors: string[];
  missingColumns: string[];
}

/**
 * Parses uploaded Excel / CSV file using SheetJS (xlsx)
 * Validates columns, duplicate entries, required fields, and formats error rows.
 */
export async function parseExcelFile(
  file: File,
  existingStudents: Student[],
  classId: string,
  schoolYearId: string
): Promise<ExcelImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Read as raw json arrays to inspect headers
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    return {
      totalRows: 0,
      validRows: [],
      errorRows: [],
      columnErrors: ['ໄຟລ໌ Excel ຫວ່າງເປົ່າ ບໍ່ມີຂໍ້ມູນ'],
      missingColumns: []
    };
  }

  // Find header row (search first 5 rows for standard Lao column headers)
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let r = 0; r < Math.min(5, rawRows.length); r++) {
    const row = rawRows[r].map(c => String(c).trim());
    if (row.includes('ຊື່') || row.includes('ລຳດັບ') || row.includes('ຄຳນຳໜ້າ')) {
      headerRowIndex = r;
      headers = row;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      totalRows: 0,
      validRows: [],
      errorRows: [],
      columnErrors: ['ບໍ່ພົບ Header ຖັນຂໍ້ມູນມາດຕະຖານໃນແຖວທຳອິດ (ຕ້ອງມີ: ລຳດັບ, ຊື່, ນາມສະກຸນ, etc.)'],
      missingColumns: [...EXCEL_COLUMNS]
    };
  }

  // Normalize column index map
  const colIndexMap: Record<string, number> = {};
  headers.forEach((h, idx) => {
    const cleanHeader = h.trim();
    if (cleanHeader) {
      colIndexMap[cleanHeader] = idx;
    }
  });

  // Check required standard columns
  const criticalHeaders = ['ລຳດັບ', 'ຄຳນຳໜ້າ', 'ຊື່', 'ນາມສະກຸນ', 'ວັນເກີດ'];
  const missingCritical = criticalHeaders.filter(ch => colIndexMap[ch] === undefined);
  const missingColumns = EXCEL_COLUMNS.filter(c => colIndexMap[c] === undefined);

  const columnErrors: string[] = [];
  if (missingCritical.length > 0) {
    columnErrors.push(`ຂາດຖັນຂໍ້ມູນຫຼັກທີ່ຈຳເປັນ: ${missingCritical.join(', ')}`);
  }

  const dataRows = rawRows.slice(headerRowIndex + 1);
  const validRows: ExcelImportRow[] = [];
  const errorRows: ExcelImportRow[] = [];

  const seenNumbersInFile = new Set<number>();
  const seenFullNamesInFile = new Set<string>();

  dataRows.forEach((row, idx) => {
    const rowIndex = headerRowIndex + 2 + idx;
    // Skip completely empty rows
    if (row.every(cell => String(cell).trim() === '')) {
      return;
    }

    const getVal = (colName: string): string => {
      const colIdx = colIndexMap[colName];
      if (colIdx === undefined || row[colIdx] === undefined) return '';
      const cellVal = row[colIdx];
      if (cellVal instanceof Date) {
        return cellVal.toISOString().split('T')[0];
      }
      return String(cellVal).trim();
    };

    const studentNumRaw = getVal('ລຳດັບ');
    const studentNumber = parseInt(studentNumRaw, 10);
    const prefix = getVal('ຄຳນຳໜ້າ') || 'ທ້າວ';
    const firstName = getVal('ຊື່');
    const lastName = getVal('ນາມສະກຸນ');
    const ethnicity = getVal('ຊົນເຜົ່າ') || 'ລາວ';
    let dateOfBirth = getVal('ວັນເກີດ');

    // Handle excel date formats
    if (dateOfBirth && dateOfBirth.includes('/')) {
      const parts = dateOfBirth.split('/');
      if (parts.length === 3) {
        // Assume YYYY/MM/DD or DD/MM/YYYY
        if (parts[0].length === 4) {
          dateOfBirth = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        } else if (parts[2].length === 4) {
          dateOfBirth = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
    }

    const birthVillage = getVal('ບ້ານເກີດ');
    const birthDistrict = getVal('ເມືອງເກີດ');
    const birthProvince = getVal('ແຂວງເກີດ') || 'ນະຄອນຫຼວງວຽງຈັນ';

    const curVillage = getVal('ບ້ານຢູ່ປັດຈຸບັນ') || birthVillage;
    const curDistrict = getVal('ເມືອງຢູ່ປັດຈຸບັນ') || birthDistrict;
    const curProvince = getVal('ແຂວງຢູ່ປັດຈຸບັນ') || birthProvince;

    const fatherFirstName = getVal('ຊື່ພໍ່');
    const fatherLastName = getVal('ນາມສະກຸນພໍ່');
    const fatherOcc = getVal('ອາຊີບພໍ່');

    const motherFirstName = getVal('ຊື່ແມ່');
    const motherLastName = getVal('ນາມສະກຸນແມ່');
    const motherOcc = getVal('ອາຊີບແມ່');

    // Phone: keep leading zero, treat as string
    const rawPhone = getVal('ເບີໂທຜູ້ປົກຄອງ');
    const guardianPhone = cleanPhoneNumber(rawPhone);

    const studentData: Partial<Student> = {
      studentNumber: isNaN(studentNumber) ? 0 : studentNumber,
      prefix,
      firstName,
      lastName,
      ethnicity,
      dateOfBirth,
      birthplace: {
        village: birthVillage,
        district: birthDistrict,
        province: birthProvince
      },
      currentAddress: {
        village: curVillage,
        district: curDistrict,
        province: curProvince
      },
      father: {
        firstName: fatherFirstName,
        lastName: fatherLastName,
        occupation: fatherOcc
      },
      mother: {
        firstName: motherFirstName,
        lastName: motherLastName,
        occupation: motherOcc
      },
      guardianPhone,
      classId,
      schoolYearId
    };

    // Validation checks
    const rowErrors: string[] = [];

    if (!studentNumber || isNaN(studentNumber) || studentNumber <= 0) {
      rowErrors.push('ລຳດັບຕ້ອງເປັນຕົວເລກ (1, 2, 3...)');
    }

    if (!prefix) {
      rowErrors.push('ຂາດຄຳນຳໜ້າ (ທ້າວ/ນາງ)');
    }

    if (!firstName) {
      rowErrors.push('ຂາດຊື່');
    }

    if (!lastName) {
      rowErrors.push('ຂາດນາມສະກຸນ');
    }

    if (!dateOfBirth) {
      rowErrors.push('ຂາດວັນເກີດ (YYYY-MM-DD)');
    }

    if (!birthVillage) {
      rowErrors.push('ຂາດບ້ານເກີດ');
    }

    if (!birthDistrict) {
      rowErrors.push('ຂາດເມືອງເກີດ');
    }

    if (!birthProvince) {
      rowErrors.push('ຂາດແຂວງເກີດ');
    }

    // Duplicate Check
    let isDuplicate = false;
    let duplicateReason = '';

    const fullNameKey = `${firstName} ${lastName}`.toLowerCase();

    // 1. Check duplicate inside current file
    if (studentNumber && seenNumbersInFile.has(studentNumber)) {
      isDuplicate = true;
      duplicateReason = `ລຳດັບ #${studentNumber} ຊ້ຳກັນໃນໄຟລ໌`;
      rowErrors.push(duplicateReason);
    } else if (studentNumber) {
      seenNumbersInFile.add(studentNumber);
    }

    if (firstName && lastName && seenFullNamesInFile.has(fullNameKey)) {
      isDuplicate = true;
      duplicateReason = `ຊື່ ${firstName} ${lastName} ຊ້ຳກັນໃນໄຟລ໌`;
      rowErrors.push(duplicateReason);
    } else if (firstName && lastName) {
      seenFullNamesInFile.add(fullNameKey);
    }

    // 2. Check duplicate with existing students in this class
    const existingNumMatch = existingStudents.find(
      s => s.classId === classId && (s.studentNumber === studentNumber || s.rollNumber === studentNumber)
    );
    if (existingNumMatch) {
      isDuplicate = true;
      duplicateReason = `ລຳດັບ #${studentNumber} ມີແລ້ວໃນຫ້ອງຮຽນ (${existingNumMatch.prefix} ${existingNumMatch.firstName})`;
      rowErrors.push(duplicateReason);
    }

    const existingNameMatch = existingStudents.find(
      s => s.classId === classId && s.firstName.toLowerCase() === firstName.toLowerCase() && s.lastName.toLowerCase() === lastName.toLowerCase()
    );
    if (existingNameMatch) {
      isDuplicate = true;
      duplicateReason = `ຊື່ ${firstName} ${lastName} ມີແລ້ວໃນຫ້ອງຮຽນ`;
      rowErrors.push(duplicateReason);
    }

    const importRow: ExcelImportRow = {
      rowIndex,
      data: studentData,
      isValid: rowErrors.length === 0,
      errors: rowErrors,
      isDuplicate,
      duplicateReason,
      raw: Object.fromEntries(headers.map((h, i) => [h, row[i]]))
    };

    if (importRow.isValid) {
      validRows.push(importRow);
    } else {
      errorRows.push(importRow);
    }
  });

  return {
    totalRows: validRows.length + errorRows.length,
    validRows,
    errorRows,
    columnErrors,
    missingColumns
  };
}

/**
 * Generates and downloads an Excel file containing students using the 19 standard columns.
 */
export function exportStudentsToExcel(students: Student[], className?: string) {
  const data = students.map(s => {
    return {
      'ລຳດັບ': s.studentNumber || s.rollNumber || '',
      'ຄຳນຳໜ້າ': s.prefix || s.title || '',
      'ຊື່': s.firstName || '',
      'ນາມສະກຸນ': s.lastName || '',
      'ຊົນເຜົ່າ': s.ethnicity || 'ລາວ',
      'ວັນເກີດ': s.dateOfBirth || s.dob || '',
      'ບ້ານເກີດ': s.birthplace?.village || s.village || '',
      'ເມືອງເກີດ': s.birthplace?.district || s.district || '',
      'ແຂວງເກີດ': s.birthplace?.province || s.province || '',
      'ບ້ານຢູ່ປັດຈຸບັນ': s.currentAddress?.village || s.village || '',
      'ເມືອງຢູ່ປັດຈຸບັນ': s.currentAddress?.district || s.district || '',
      'ແຂວງຢູ່ປັດຈຸບັນ': s.currentAddress?.province || s.province || '',
      'ຊື່ພໍ່': s.father?.firstName || '',
      'ນາມສະກຸນພໍ່': s.father?.lastName || '',
      'ອາຊີບພໍ່': s.father?.occupation || '',
      'ຊື່ແມ່': s.mother?.firstName || '',
      'ນາມສະກຸນແມ່': s.mother?.lastName || '',
      'ອາຊີບແມ່': s.mother?.occupation || '',
      'ເບີໂທຜູ້ປົກຄອງ': s.guardianPhone || s.phone || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data, { header: [...EXCEL_COLUMNS] });

  // Auto column widths
  const colWidths = EXCEL_COLUMNS.map(col => {
    const maxLen = Math.max(
      col.length * 2,
      ...data.map(d => String(d[col as keyof typeof d] || '').length * 1.5)
    );
    return { wch: Math.min(Math.max(maxLen, 12), 30) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

  const fileName = `Lao_Student_Database_${className ? className.replace(/\//g, '-') : 'All'}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Generates and downloads an empty template Excel file with sample data.
 */
export function downloadExcelTemplate() {
  const sampleData = [
    {
      'ລຳດັບ': 1,
      'ຄຳນຳໜ້າ': 'ທ້າວ',
      'ຊື່': 'ສົມຈິດ',
      'ນາມສະກຸນ': 'ແກ້ວມະນີ',
      'ຊົນເຜົ່າ': 'ລາວ',
      'ວັນເກີດ': '2008-04-15',
      'ບ້ານເກີດ': 'ບ້ານ ໜອງທາເໜືອ',
      'ເມືອງເກີດ': 'ຈັນທະບູລີ',
      'ແຂວງເກີດ': 'ນະຄອນຫຼວງວຽງຈັນ',
      'ບ້ານຢູ່ປັດຈຸບັນ': 'ບ້ານ ໜອງທາເໜືອ',
      'ເມືອງຢູ່ປັດຈຸບັນ': 'ຈັນທະບູລີ',
      'ແຂວງຢູ່ປັດຈຸບັນ': 'ນະຄອນຫຼວງວຽງຈັນ',
      'ຊື່ພໍ່': 'ສົມບູນ',
      'ນາມສະກຸນພໍ່': 'ແກ້ວມະນີ',
      'ອາຊີບພໍ່': 'ພະນັກງານລັດ',
      'ຊື່ແມ່': 'ວຽງທອງ',
      'ນາມສະກຸນແມ່': 'ແກ້ວມະນີ',
      'ອາຊີບແມ່': 'ຄ້າຂາຍ',
      'ເບີໂທຜູ້ປົກຄອງ': '020 55112233'
    },
    {
      'ລຳດັບ': 2,
      'ຄຳນຳໜ້າ': 'ນາງ',
      'ຊື່': 'ດາວອນ',
      'ນາມສະກຸນ': 'ສີສຸວັນ',
      'ຊົນເຜົ່າ': 'ລາວ',
      'ວັນເກີດ': '2008-07-22',
      'ບ້ານເກີດ': 'ບ້ານ ໂພນສະອາດ',
      'ເມືອງເກີດ': 'ໄຊເສດຖາ',
      'ແຂວງເກີດ': 'ນະຄອນຫຼວງວຽງຈັນ',
      'ບ້ານຢູ່ປັດຈຸບັນ': 'ບ້ານ ໂພນສະອາດ',
      'ເມືອງຢູ່ປັດຈຸບັນ': 'ໄຊເສດຖາ',
      'ແຂວງຢູ່ປັດຈຸບັນ': 'ນະຄອນຫຼວງວຽງຈັນ',
      'ຊື່ພໍ່': 'ບຸນທອງ',
      'ນາມສະກຸນພໍ່': 'ສີສຸວັນ',
      'ອາຊີບພໍ່': 'ທຸລະກິດສ່ວນຕົວ',
      'ຊື່ແມ່': 'ແກ້ວມະນີ',
      'ນາມສະກຸນແມ່': 'ສີສຸວັນ',
      'ອາຊີບແມ່': 'ແມ່ບ້ານ',
      'ເບີໂທຜູ້ປົກຄອງ': '020 55889900'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: [...EXCEL_COLUMNS] });
  worksheet['!cols'] = EXCEL_COLUMNS.map(() => ({ wch: 18 }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Student_Template');

  XLSX.writeFile(workbook, 'Lao_Student_Score_Template.xlsx');
}
