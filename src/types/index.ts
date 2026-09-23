export interface School {
  id?: string;
  name: string;
  province: string;
  district: string;
  cluster: string;
  logoUrl?: string;
  phone: string;
  email: string;
  address: string;
  updatedAt?: string;
}

export interface SchoolYear {
  id: string;
  name: string; // e.g. "2025-2026"
  isCurrent: boolean;
  createdAt?: string;
}

export interface ClassRoom {
  id: string;
  grade: string; // e.g. "ມ.7"
  room: string;  // e.g. "7/1"
  name: string;  // e.g. "ມ.7/1"
  schoolYearId: string;
  homeroomTeacher?: string;
  createdAt?: string;
}

export interface AddressInfo {
  village: string;
  district: string;
  province: string;
}

export interface ParentInfo {
  firstName: string;
  lastName: string;
  occupation: string;
}

export interface Student {
  id: string;
  studentNumber: number; // ລຳດັບ (Required)
  prefix: string;        // ຄຳນຳໜ້າ (Required: "ທ້າວ" | "ນາງ" | etc.)
  firstName: string;     // ຊື່ (Required)
  lastName: string;      // ນາມສະກຸນ (Required)
  ethnicity: string;     // ຊົນເຜົ່າ (e.g. "ລາວ", "ມົ້ງ", "ຂະມຸ", "ໄທດຳ")
  dateOfBirth: string;   // ວັນເກີດ (Required: YYYY-MM-DD)

  birthplace: AddressInfo;     // ບ່ອນເກີດ: ບ້ານ, ເມືອງ, ແຂວງ (Required)
  currentAddress: AddressInfo; // ທີ່ຢູ່ປັດຈຸບັນ: ບ້ານ, ເມືອງ, ແຂວງ (Required)

  father: ParentInfo;          // ຂໍ້ມູນພໍ່: ຊື່, ນາມສະກຸນ, ອາຊີບ (Optional)
  mother: ParentInfo;          // ຂໍ້ມູນແມ່: ຊື່, ນາມສະກຸນ, ອາຊີບ (Optional)
  guardianPhone: string;       // ເບີໂທຜູ້ປົກຄອງ (string, preserves leading 0)

  classId: string;
  schoolYearId: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;

  // Backwards compatibility aliases
  rollNumber: number;          // maps to studentNumber
  title: string;               // maps to prefix
  dob?: string;                // maps to dateOfBirth
  studentId?: string;          // e.g. "ST-0001"
  gender?: 'male' | 'female';
  village?: string;            // maps to currentAddress.village
  district?: string;           // maps to currentAddress.district
  province?: string;           // maps to currentAddress.province
  phone?: string;              // maps to guardianPhone
  fatherInfo?: string;
  motherInfo?: string;
  guardianOccupation?: string;
  notes?: string;
}

export interface Subject {
  id: string;
  name: string; // e.g. "ພາສາລາວ", "ຄະນິດສາດ"
  code: string; // e.g. "MATH", "LAO"
  order: number;
  isActive: boolean;
  gradeLevel?: string; // all or specific grade
  createdAt?: string;
}

export interface ScorePeriod {
  id: string;
  code: string; // "09", "10", "11", "12", "exam1", "02", "03", "04", "05", "exam2"
  name: string; // "ເດືອນ 9", "ເສັງພາກ I", ...
  semester: 1 | 2;
  isExam: boolean;
  order: number;
}

export interface ScoreRecord {
  id?: string;
  studentId: string;
  subjectId: string;
  classId: string;
  schoolYearId: string;
  periodId: string;
  score: number; // 0 - 10
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface AttendanceRecord {
  id?: string;
  studentId: string;
  schoolYearId: string;
  classId: string;
  semester: 1 | 2;
  absentUnexcused: number; // ຂາດ
  absentExcused: number;   // ລາ
  notes?: string;
  updatedAt?: string;
}

export interface BehaviorRecord {
  id?: string;
  studentId: string;
  schoolYearId: string;
  classId: string;
  semester: 1 | 2;
  conductScore: string; // "ດີຫຼາຍ", "ດີ", "ປານກາງ", "ອ່ອນ"
  laborScore: string;   // ຄະແນນອອກແຮງງານ
  notes?: string;
  updatedAt?: string;
}

export interface SystemSettings {
  passScoreThreshold: number; // default 5.0
  maxScore: number; // 10
  minScore: number; // 0
  formula: string; // "standard_moes" (Ministry of Education & Sports)
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'teacher';
  photoURL?: string;
}

export type ReportCategory =
  | 'class_monthly'
  | 'class_sem1'
  | 'class_sem2'
  | 'class_annual'
  | 'subject'
  | 'individual'
  | 'tracking_book';

export interface ReportHistoryRecord {
  id?: string;
  reportType: ReportCategory;
  reportTitle: string;
  schoolYearId: string;
  schoolYearName?: string;
  classId: string;
  className?: string;
  studentId?: string;
  studentName?: string;
  subjectId?: string;
  subjectName?: string;
  periodId?: string;
  periodName?: string;
  fileName: string;
  generatedBy: string;
  generatedAt: string;
}
