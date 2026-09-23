import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import {
  School,
  SchoolYear,
  ClassRoom,
  Student,
  Subject,
  ScorePeriod,
  ScoreRecord,
  AttendanceRecord,
  BehaviorRecord,
  ReportHistoryRecord
} from '../types';
import { normalizeStudent, prepareStudentPayload } from './studentHelper';

// Default initial score periods required by the specification
export const DEFAULT_PERIODS: Omit<ScorePeriod, 'id'>[] = [
  { code: '09', name: 'ເດືອນ 9 (ກັນຍາ)', semester: 1, isExam: false, order: 1 },
  { code: '10', name: 'ເດືອນ 10 (ຕຸລາ)', semester: 1, isExam: false, order: 2 },
  { code: '11', name: 'ເດືອນ 11 (ພະຈິກ)', semester: 1, isExam: false, order: 3 },
  { code: '12', name: 'ເດືອນ 12 (ທັນວາ)', semester: 1, isExam: false, order: 4 },
  { code: 'exam1', name: 'ເສັງພາກ I', semester: 1, isExam: true, order: 5 },
  { code: '02', name: 'ເດືອນ 2 (ກຸມພາ)', semester: 2, isExam: false, order: 6 },
  { code: '03', name: 'ເດືອນ 3 (ມີນາ)', semester: 2, isExam: false, order: 7 },
  { code: '04', name: 'ເດືອນ 4 (ເມສາ)', semester: 2, isExam: false, order: 8 },
  { code: '05', name: 'ເດືອນ 5 (ພຶດສະພາ)', semester: 2, isExam: false, order: 9 },
  { code: 'exam2', name: 'ເສັງພາກ II', semester: 2, isExam: true, order: 10 },
];

export const DEFAULT_SUBJECTS: Omit<Subject, 'id'>[] = [
  { name: 'ພາສາລາວ', code: 'LAO', order: 1, isActive: true },
  { name: 'ວັນນະຄະດີ', code: 'LIT', order: 2, isActive: true },
  { name: 'ຄະນິດສາດ', code: 'MATH', order: 3, isActive: true },
  { name: 'ຟີຊິກສາດ', code: 'PHYS', order: 4, isActive: true },
  { name: 'ເຄມີສາດ', code: 'CHEM', order: 5, isActive: true },
  { name: 'ຊີວະສາດ', code: 'BIO', order: 6, isActive: true },
  { name: 'ພູມສາດ', code: 'GEO', order: 7, isActive: true },
  { name: 'ປະຫວັດສາດ', code: 'HIST', order: 8, isActive: true },
  { name: 'ສຶກສາພົນລະເມືອງ', code: 'CIV', order: 9, isActive: true },
  { name: 'ICT', code: 'ICT', order: 10, isActive: true },
  { name: 'ພາສາອັງກິດ', code: 'ENG', order: 11, isActive: true },
  { name: 'ພາສາຈີນ', code: 'CHI', order: 12, isActive: true },
  { name: 'ພະລະສຶກສາ', code: 'PE', order: 13, isActive: true },
];

// --- School Information ---
export async function getSchoolInfo(): Promise<School | null> {
  const docRef = doc(db, 'schools', 'main');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as School;
  }
  return null;
}

export async function saveSchoolInfo(data: Partial<School>): Promise<void> {
  const docRef = doc(db, 'schools', 'main');
  await setDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// --- School Years ---
export async function getSchoolYears(): Promise<SchoolYear[]> {
  const colRef = collection(db, 'schoolYears');
  const snap = await getDocs(colRef);
  const list: SchoolYear[] = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() } as SchoolYear));
  return list.sort((a, b) => b.name.localeCompare(a.name));
}

export async function createSchoolYear(name: string, isCurrent: boolean): Promise<SchoolYear> {
  const colRef = collection(db, 'schoolYears');
  const docRef = await addDoc(colRef, {
    name,
    isCurrent,
    createdAt: new Date().toISOString()
  });
  return { id: docRef.id, name, isCurrent };
}

// --- Classes ---
export async function getClasses(schoolYearId?: string): Promise<ClassRoom[]> {
  const colRef = collection(db, 'classes');
  let q = colRef;
  const snap = await getDocs(q);
  const list: ClassRoom[] = [];
  snap.forEach(d => {
    const data = d.data();
    if (!schoolYearId || data.schoolYearId === schoolYearId) {
      list.push({ ...(data as Omit<ClassRoom, 'id'>), id: d.id });
    }
  });
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createClass(data: Omit<ClassRoom, 'id'>): Promise<ClassRoom> {
  const colRef = collection(db, 'classes');
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: new Date().toISOString()
  });
  return { ...data, id: docRef.id };
}

export async function deleteClass(classId: string): Promise<void> {
  await deleteDoc(doc(db, 'classes', classId));
}

// --- Students ---
export async function getStudents(classId?: string, schoolYearId?: string): Promise<Student[]> {
  const colRef = collection(db, 'students');
  const snap = await getDocs(colRef);
  const list: Student[] = [];
  snap.forEach(d => {
    const data = d.data();
    if (
      (!classId || data.classId === classId) &&
      (!schoolYearId || data.schoolYearId === schoolYearId)
    ) {
      list.push(normalizeStudent(data, d.id));
    }
  });
  return list.sort((a, b) => (a.studentNumber || a.rollNumber) - (b.studentNumber || b.rollNumber));
}

export async function createStudent(data: Partial<Student>, currentUserEmail?: string): Promise<Student> {
  const colRef = collection(db, 'students');
  const payload = prepareStudentPayload(data, currentUserEmail, true);
  const docRef = await addDoc(colRef, payload);
  return normalizeStudent(payload, docRef.id);
}

export async function updateStudent(id: string, data: Partial<Student>): Promise<void> {
  const docRef = doc(db, 'students', id);
  const payload = prepareStudentPayload(data, undefined, false);
  await updateDoc(docRef, payload);
}

export async function batchCreateStudents(studentsData: Partial<Student>[], currentUserEmail?: string): Promise<number> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  let count = 0;

  for (const st of studentsData) {
    const sRef = doc(collection(db, 'students'));
    const payload = prepareStudentPayload(st, currentUserEmail, true);
    payload.createdAt = now;
    payload.updatedAt = now;
    batch.set(sRef, payload);
    count++;
  }

  if (count > 0) {
    await batch.commit();
  }
  return count;
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, 'students', id));
}

// --- Subjects ---
export async function getSubjects(): Promise<Subject[]> {
  const colRef = collection(db, 'subjects');
  const snap = await getDocs(colRef);
  const list: Subject[] = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() } as Subject));
  return list.sort((a, b) => a.order - b.order);
}

export async function createSubject(data: Omit<Subject, 'id'>): Promise<Subject> {
  const colRef = collection(db, 'subjects');
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: new Date().toISOString()
  });
  return { id: docRef.id, ...data };
}

export async function updateSubject(id: string, data: Partial<Subject>): Promise<void> {
  const docRef = doc(db, 'subjects', id);
  await updateDoc(docRef, data);
}

export async function deleteSubject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'subjects', id));
}

// --- Score Periods ---
export async function getScorePeriods(): Promise<ScorePeriod[]> {
  const colRef = collection(db, 'scorePeriods');
  const snap = await getDocs(colRef);
  const list: ScorePeriod[] = [];
  snap.forEach(d => list.push({ id: d.id, ...d.data() } as ScorePeriod));
  return list.sort((a, b) => a.order - b.order);
}

// --- Scores ---
export async function getScoresForClass(classId: string, schoolYearId: string): Promise<ScoreRecord[]> {
  const colRef = collection(db, 'scores');
  const snap = await getDocs(colRef);
  const list: ScoreRecord[] = [];
  snap.forEach(d => {
    const data = d.data() as ScoreRecord;
    if (data.classId === classId && data.schoolYearId === schoolYearId) {
      list.push({ id: d.id, ...data });
    }
  });
  return list;
}

export async function saveSingleScore(record: ScoreRecord): Promise<void> {
  // Unique composite key id: studentId_subjectId_periodId
  const scoreDocId = `${record.studentId}_${record.subjectId}_${record.periodId}`;
  const docRef = doc(db, 'scores', scoreDocId);
  await setDoc(docRef, {
    ...record,
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function saveBatchScores(records: ScoreRecord[]): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  for (const r of records) {
    const docId = `${r.studentId}_${r.subjectId}_${r.periodId}`;
    const docRef = doc(db, 'scores', docId);
    batch.set(docRef, {
      ...r,
      updatedAt: now
    }, { merge: true });
  }
  await batch.commit();
}

// --- Attendance & Behavior ---
export async function getAttendanceForStudent(studentId: string, schoolYearId: string): Promise<AttendanceRecord[]> {
  const colRef = collection(db, 'attendance');
  const snap = await getDocs(colRef);
  const list: AttendanceRecord[] = [];
  snap.forEach(d => {
    const data = d.data() as AttendanceRecord;
    if (data.studentId === studentId && data.schoolYearId === schoolYearId) {
      list.push({ id: d.id, ...data });
    }
  });
  return list;
}

export async function saveAttendance(record: AttendanceRecord): Promise<void> {
  const docId = `${record.studentId}_${record.schoolYearId}_${record.semester}`;
  const docRef = doc(db, 'attendance', docId);
  await setDoc(docRef, { ...record, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function getBehaviorForStudent(studentId: string, schoolYearId: string): Promise<BehaviorRecord[]> {
  const colRef = collection(db, 'behavior');
  const snap = await getDocs(colRef);
  const list: BehaviorRecord[] = [];
  snap.forEach(d => {
    const data = d.data() as BehaviorRecord;
    if (data.studentId === studentId && data.schoolYearId === schoolYearId) {
      list.push({ id: d.id, ...data });
    }
  });
  return list;
}

export async function saveBehavior(record: BehaviorRecord): Promise<void> {
  const docId = `${record.studentId}_${record.schoolYearId}_${record.semester}`;
  const docRef = doc(db, 'behavior', docId);
  await setDoc(docRef, { ...record, updatedAt: new Date().toISOString() }, { merge: true });
}

// --- Seed Database with Initial Academic Defaults if empty ---
export async function seedInitialDataIfNeeded(userId?: string): Promise<void> {
  try {
    // 1. Check School
    const schoolSnap = await getDoc(doc(db, 'schools', 'main'));
    if (!schoolSnap.exists()) {
      await setDoc(doc(db, 'schools', 'main'), {
        name: 'ໂຮງຮຽນ ມັດທະຍົມສົມບູນ ວຽງຈັນ (Vientiane Secondary School)',
        province: 'ນະຄອນຫຼວງວຽງຈັນ',
        district: 'ຈັນທະບູລີ',
        cluster: 'ກຸ່ມທີ 1 ມັດທະຍົມຕອນປາຍ',
        phone: '021 214567 / 020 55667788',
        email: 'info@vientiane-school.edu.la',
        address: 'ຖະໜົນລ້ານຊ້າງ, ບ້ານຊຽງເຢີນ, ເມືອງຈັນທະບູລີ, ນະຄອນຫຼວງວຽງຈັນ',
        logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&auto=format&fit=crop&q=80',
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Check Score Periods
    const periodsSnap = await getDocs(collection(db, 'scorePeriods'));
    if (periodsSnap.empty) {
      const batch = writeBatch(db);
      for (const p of DEFAULT_PERIODS) {
        const pRef = doc(db, 'scorePeriods', p.code);
        batch.set(pRef, { ...p, createdAt: new Date().toISOString() });
      }
      await batch.commit();
    }

    // 3. Check Subjects
    const subjectsSnap = await getDocs(collection(db, 'subjects'));
    if (subjectsSnap.empty) {
      const batch = writeBatch(db);
      for (const s of DEFAULT_SUBJECTS) {
        const sRef = doc(collection(db, 'subjects'));
        batch.set(sRef, { ...s, createdAt: new Date().toISOString() });
      }
      await batch.commit();
    }

    // 4. Check School Year
    const yearsSnap = await getDocs(collection(db, 'schoolYears'));
    let defaultYearId = '';
    if (yearsSnap.empty) {
      const yRef = await addDoc(collection(db, 'schoolYears'), {
        name: '2025-2026',
        isCurrent: true,
        createdAt: new Date().toISOString()
      });
      defaultYearId = yRef.id;
    } else {
      defaultYearId = yearsSnap.docs[0].id;
    }

    // 5. Check Classes
    const classesSnap = await getDocs(collection(db, 'classes'));
    let defaultClassId = '';
    if (classesSnap.empty && defaultYearId) {
      const cRef = await addDoc(collection(db, 'classes'), {
        grade: 'ມ.7',
        room: '7/1',
        name: 'ມ.7/1',
        schoolYearId: defaultYearId,
        homeroomTeacher: 'ອາຈານ ສົມສະນຸກ ວົງໄຊ',
        createdAt: new Date().toISOString()
      });
      defaultClassId = cRef.id;

      await addDoc(collection(db, 'classes'), {
        grade: 'ມ.7',
        room: '7/2',
        name: 'ມ.7/2',
        schoolYearId: defaultYearId,
        homeroomTeacher: 'ອາຈານ ຄຳແພງ ມະນີວົງ',
        createdAt: new Date().toISOString()
      });
    } else if (!classesSnap.empty) {
      defaultClassId = classesSnap.docs[0].id;
    }

    // 6. Check Students
    const studentsSnap = await getDocs(collection(db, 'students'));
    if (studentsSnap.empty && defaultClassId && defaultYearId) {
      const sampleStudents: Partial<Student>[] = [
        {
          studentNumber: 1,
          prefix: 'ທ້າວ',
          firstName: 'ບຸນມີ',
          lastName: 'ສີສຸວັນ',
          ethnicity: 'ລາວ',
          dateOfBirth: '2008-04-12',
          birthplace: {
            village: 'ບ້ານ ໜອງທາເໜືອ',
            district: 'ຈັນທະບູລີ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          currentAddress: {
            village: 'ບ້ານ ໜອງທາເໜືອ',
            district: 'ຈັນທະບູລີ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          father: {
            firstName: 'ສົມຈິດ',
            lastName: 'ສີສຸວັນ',
            occupation: 'ພະນັກງານລັດ'
          },
          mother: {
            firstName: 'ວັນດີ',
            lastName: 'ສີສຸວັນ',
            occupation: 'ຄ້າຂາຍ'
          },
          guardianPhone: '020 55112233',
          classId: defaultClassId,
          schoolYearId: defaultYearId,
          notes: 'ຫົວໜ້າຫ້ອງ',
        },
        {
          studentNumber: 2,
          prefix: 'ນາງ',
          firstName: 'ດາວອນ',
          lastName: 'ແກ້ວມະນີ',
          ethnicity: 'ລາວ',
          dateOfBirth: '2008-07-25',
          birthplace: {
            village: 'ບ້ານ ໂພນສະອາດ',
            district: 'ໄຊເສດຖາ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          currentAddress: {
            village: 'ບ້ານ ໂພນສະອາດ',
            district: 'ໄຊເສດຖາ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          father: {
            firstName: 'ບຸນທອງ',
            lastName: 'ແກ້ວມະນີ',
            occupation: 'ຄ້າຂາຍ'
          },
          mother: {
            firstName: 'ແກ້ວ',
            lastName: 'ແກ້ວມະນີ',
            occupation: 'ແມ່ບ້ານ'
          },
          guardianPhone: '020 55443322',
          classId: defaultClassId,
          schoolYearId: defaultYearId,
          notes: 'ຮອງຫົວໜ້າຫ້ອງ ຮັບຜິດຊອບການຮຽນ',
        },
        {
          studentNumber: 3,
          prefix: 'ທ້າວ',
          firstName: 'ຄຳຫຼ້າ',
          lastName: 'ພົມມະຈັນ',
          ethnicity: 'ລາວ',
          dateOfBirth: '2008-11-05',
          birthplace: {
            village: 'ບ້ານ ທາດຫຼວງ',
            district: 'ໄຊເສດຖາ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          currentAddress: {
            village: 'ບ້ານ ທາດຫຼວງ',
            district: 'ໄຊເສດຖາ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          father: {
            firstName: 'ສອນເພັດ',
            lastName: 'ພົມມະຈັນ',
            occupation: 'ທຸລະກິດສ່ວນຕົວ'
          },
          mother: {
            firstName: 'ມາລີ',
            lastName: 'ພົມມະຈັນ',
            occupation: 'ຊາວກະສິກອນ'
          },
          guardianPhone: '020 55998877',
          classId: defaultClassId,
          schoolYearId: defaultYearId,
          notes: '',
        },
        {
          studentNumber: 4,
          prefix: 'ນາງ',
          firstName: 'ມະນີວອນ',
          lastName: 'ໄຊຍະວົງ',
          ethnicity: 'ລາວ',
          dateOfBirth: '2008-02-18',
          birthplace: {
            village: 'ບ້ານ ສີຫອມ',
            district: 'ຈັນທະບູລີ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          currentAddress: {
            village: 'ບ້ານ ສີຫອມ',
            district: 'ຈັນທະບູລີ',
            province: 'ນະຄອນຫຼວງວຽງຈັນ'
          },
          father: {
            firstName: 'ຄຳຜົງ',
            lastName: 'ໄຊຍະວົງ',
            occupation: 'ຊາວກະສິກອນ'
          },
          mother: {
            firstName: 'ບົວຄຳ',
            lastName: 'ໄຊຍະວົງ',
            occupation: 'ແມ່ບ້ານ'
          },
          guardianPhone: '020 55224466',
          classId: defaultClassId,
          schoolYearId: defaultYearId,
          notes: '',
        }
      ];

      const batch = writeBatch(db);
      for (const st of sampleStudents) {
        const sRef = doc(collection(db, 'students'));
        const payload = prepareStudentPayload(st, 'system', true);
        batch.set(sRef, payload);
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('Initial seeding error:', err);
  }
}

// --- Report History (Requirement 23) ---
export async function saveReportHistory(record: Omit<ReportHistoryRecord, 'id'>): Promise<string> {
  try {
    const colRef = collection(db, 'reports');
    const docRef = await addDoc(colRef, {
      ...record,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.error('Failed to save report history:', err);
    return '';
  }
}

export async function getReportHistory(limitCount: number = 20): Promise<ReportHistoryRecord[]> {
  try {
    const colRef = collection(db, 'reports');
    const q = query(colRef, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const list: ReportHistoryRecord[] = [];
    snap.forEach(d => {
      const data = d.data();
      list.push({
        id: d.id,
        reportType: data.reportType || 'class_monthly',
        reportTitle: data.reportTitle || data.title || 'ລາຍງານຄະແນນ',
        schoolYearId: data.schoolYearId || '',
        schoolYearName: data.schoolYearName || '',
        classId: data.classId || '',
        className: data.className || '',
        studentId: data.studentId || '',
        studentName: data.studentName || '',
        subjectId: data.subjectId || '',
        subjectName: data.subjectName || '',
        periodId: data.periodId || '',
        periodName: data.periodName || '',
        fileName: data.fileName || 'Report.pdf',
        generatedBy: data.generatedBy || 'ຄູສອນ / Admin',
        generatedAt: data.generatedAt || data.createdAt || new Date().toISOString()
      });
    });
    return list.slice(0, limitCount);
  } catch (err) {
    console.error('Failed to fetch report history:', err);
    return [];
  }
}

