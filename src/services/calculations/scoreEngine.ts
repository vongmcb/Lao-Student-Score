import { Subject, ScorePeriod, ScoreRecord, Student } from '../../types';

export interface SubjectMonthlyCalculation {
  monthlyAvg: number | null;
  isComplete: boolean;
  enteredCount: number;
  totalRequired: number;
  missingCodes: string[];
  statusLabel: 'ຄົບ' | 'ຍັງບໍ່ຄົບ';
}

export interface SubjectSemesterCalculation {
  monthlyAvg: number | null;
  examScore: number | null;
  semesterScore: number | null;
  isComplete: boolean;
  status: 'complete' | 'missing_monthly' | 'awaiting_exam' | 'incomplete';
  statusLabel: string;
}

export interface SubjectScoreCalculation {
  subjectId: string;
  subjectName: string;
  subjectCode: string;

  // Raw period scores map (code -> number | null)
  periodScores: Record<string, number | null>;

  // Semester 1
  sem1Monthly: SubjectMonthlyCalculation;
  exam1: number | null;
  semester1: SubjectSemesterCalculation;

  // Semester 2
  sem2Monthly: SubjectMonthlyCalculation;
  exam2: number | null;
  semester2: SubjectSemesterCalculation;

  // Annual
  annualScore: number | null;
  isAnnualComplete: boolean;
  annualStatus: 'complete' | 'incomplete';
  annualStatusLabel: string;
}

export interface StudentCalculatedSummary {
  studentId: string;
  student?: Student;
  subjectResults: Record<string, SubjectScoreCalculation>;

  // Semester 1 aggregates
  totalSemester1: number | null;
  avgSemester1: number | null;
  validSubjectCountSem1: number;
  isSemester1Complete: boolean;
  statusSem1: 'complete' | 'missing_scores' | 'awaiting_exam';
  statusSem1Label: string;

  // Semester 2 aggregates
  totalSemester2: number | null;
  avgSemester2: number | null;
  validSubjectCountSem2: number;
  isSemester2Complete: boolean;
  statusSem2: 'complete' | 'missing_scores' | 'awaiting_exam';
  statusSem2Label: string;

  // Annual aggregates
  totalAnnual: number | null;
  avgAnnual: number | null;
  validSubjectCountAnnual: number;
  isAnnualComplete: boolean;
  statusAnnual: 'complete' | 'missing_scores' | 'awaiting_exam';
  statusAnnualLabel: string;

  // Missing details list
  missingItems: {
    subjectId: string;
    subjectName: string;
    periodCode: string;
    periodName: string;
    isExam: boolean;
    semester: 1 | 2;
  }[];

  // Competition rank
  rankSem1?: number | null;
  rankSem2?: number | null;
  rankAnnual?: number | null;
}

/**
 * Validates score input strictly in range [0, 10]
 */
export function validateScore(value: string | number | null | undefined): {
  isValid: boolean;
  error?: string;
  parsedValue: number | null;
} {
  if (value === null || value === undefined || value === '') {
    return { isValid: true, parsedValue: null };
  }

  const str = String(value).trim();
  if (str === '') {
    return { isValid: true, parsedValue: null };
  }

  const num = typeof value === 'number' ? value : parseFloat(str);
  if (isNaN(num)) {
    return { isValid: false, error: 'ຕ້ອງເປັນຕົວເລກເທົ່ານັ້ນ', parsedValue: null };
  }

  if (num < 0 || num > 10) {
    return { isValid: false, error: 'ຄະແນນຕ້ອງຢູ່ລະຫວ່າງ 0 ຫາ 10', parsedValue: null };
  }

  // Preserve numerical accuracy to 2 decimals
  const rounded = Math.round(num * 100) / 100;
  return { isValid: true, parsedValue: rounded };
}

/**
 * Central rounding & formatting function for score display
 * Default 2 decimal places (e.g., 8.50, 7.25, 9.63)
 * Does NOT alter raw underlying score calculations
 */
export function formatScore(
  score: number | null | undefined,
  decimals: number = 2,
  fallback: string = '—'
): string {
  if (score === null || score === undefined || isNaN(score)) {
    return fallback;
  }
  return score.toFixed(decimals);
}

/**
 * Calculates monthly average for a semester
 * Rule:
 * - If all required monthly periods have scores: sum / count
 * - If ANY month is missing: returns null and isComplete: false ("ຍັງບໍ່ຄົບ")
 * - Missing score is NEVER treated as 0
 */
export function calculateMonthlyAverage(
  scoresByPeriod: Record<string, number | null>,
  monthlyPeriods: ScorePeriod[]
): SubjectMonthlyCalculation {
  const missingCodes: string[] = [];
  let sum = 0;
  let enteredCount = 0;

  for (const p of monthlyPeriods) {
    const val = scoresByPeriod[p.code];
    if (val !== null && val !== undefined && !isNaN(val)) {
      sum += val;
      enteredCount++;
    } else {
      missingCodes.push(p.code);
    }
  }

  const totalRequired = monthlyPeriods.length;
  // Must have all monthly periods filled to be considered complete
  const isComplete = totalRequired > 0 && enteredCount === totalRequired;

  const monthlyAvg = isComplete ? sum / totalRequired : null;

  return {
    monthlyAvg,
    isComplete,
    enteredCount,
    totalRequired,
    missingCodes,
    statusLabel: isComplete ? 'ຄົບ' : 'ຍັງບໍ່ຄົບ',
  };
}

/**
 * Calculates Semester score for a subject
 * Formula: Semester Score = (Monthly Average + Exam Score) / 2
 * Rules:
 * - Calculate ONLY when monthly average is complete AND exam score is present
 * - If exam missing -> "ລໍຖ້າຄະແນນເສັງ"
 * - If monthly average incomplete -> "ຍັງບໍ່ຄົບ"
 * - Never treat missing score as 0
 */
export function calculateSemesterScore(
  monthlyCalc: SubjectMonthlyCalculation,
  examScore: number | null | undefined
): SubjectSemesterCalculation {
  const hasExam = examScore !== null && examScore !== undefined && !isNaN(examScore);

  if (monthlyCalc.isComplete && hasExam && monthlyCalc.monthlyAvg !== null) {
    const score = (monthlyCalc.monthlyAvg + examScore) / 2;
    return {
      monthlyAvg: monthlyCalc.monthlyAvg,
      examScore,
      semesterScore: score,
      isComplete: true,
      status: 'complete',
      statusLabel: 'ຄົບແລ້ວ',
    };
  }

  if (monthlyCalc.isComplete && !hasExam) {
    return {
      monthlyAvg: monthlyCalc.monthlyAvg,
      examScore: null,
      semesterScore: null,
      isComplete: false,
      status: 'awaiting_exam',
      statusLabel: 'ລໍຖ້າຄະແນນເສັງ',
    };
  }

  if (!monthlyCalc.isComplete) {
    return {
      monthlyAvg: null,
      examScore: hasExam ? examScore : null,
      semesterScore: null,
      isComplete: false,
      status: 'missing_monthly',
      statusLabel: 'ຍັງບໍ່ຄົບ',
    };
  }

  return {
    monthlyAvg: null,
    examScore: null,
    semesterScore: null,
    isComplete: false,
    status: 'incomplete',
    statusLabel: 'ຄຳນວນບໍ່ໄດ້',
  };
}

/**
 * Calculates Annual score for a subject
 * Formula: Annual Score = (Semester I + Semester II) / 2
 * Rules:
 * - Calculate ONLY when BOTH Semester I and Semester II are complete
 * - If either is incomplete -> returns null and "ຍັງບໍ່ສຳເລັດ"
 */
export function calculateAnnualScore(
  sem1Calc: SubjectSemesterCalculation,
  sem2Calc: SubjectSemesterCalculation
): {
  annualScore: number | null;
  isComplete: boolean;
  status: 'complete' | 'incomplete';
  statusLabel: string;
} {
  if (
    sem1Calc.isComplete &&
    sem2Calc.isComplete &&
    sem1Calc.semesterScore !== null &&
    sem2Calc.semesterScore !== null
  ) {
    const score = (sem1Calc.semesterScore + sem2Calc.semesterScore) / 2;
    return {
      annualScore: score,
      isComplete: true,
      status: 'complete',
      statusLabel: 'ຄົບແລ້ວ',
    };
  }

  return {
    annualScore: null,
    isComplete: false,
    status: 'incomplete',
    statusLabel: 'ຍັງບໍ່ສຳເລັດ',
  };
}

/**
 * Calculates full scores for a single student across all subjects and periods
 * Period and subject list are passed dynamically from Firebase!
 */
export function calculateStudentSubjectScores(
  studentId: string,
  scoresBySubjectAndPeriod: Record<string, Record<string, number | null>>,
  subjects: Subject[],
  periods: ScorePeriod[],
  studentObj?: Student
): StudentCalculatedSummary {
  // Separate periods dynamically by semester and type
  const sem1MonthlyPeriods = periods
    .filter(p => p.semester === 1 && !p.isExam)
    .sort((a, b) => a.order - b.order);
  const sem1ExamPeriod = periods.find(p => p.semester === 1 && p.isExam);

  const sem2MonthlyPeriods = periods
    .filter(p => p.semester === 2 && !p.isExam)
    .sort((a, b) => a.order - b.order);
  const sem2ExamPeriod = periods.find(p => p.semester === 2 && p.isExam);

  const subjectResults: Record<string, SubjectScoreCalculation> = {};
  const missingItems: StudentCalculatedSummary['missingItems'] = [];

  const activeSubjects = subjects.filter(s => s.isActive);

  let sem1Total = 0;
  let sem1ValidCount = 0;
  let sem1HasAwaitingExam = false;
  let sem1HasMissingMonthly = false;

  let sem2Total = 0;
  let sem2ValidCount = 0;
  let sem2HasAwaitingExam = false;
  let sem2HasMissingMonthly = false;

  let annualTotal = 0;
  let annualValidCount = 0;

  for (const sub of activeSubjects) {
    const pScores = scoresBySubjectAndPeriod[sub.id] || {};

    // Track missing monthly periods Sem 1
    for (const p of sem1MonthlyPeriods) {
      const val = pScores[p.code];
      if (val === null || val === undefined || isNaN(val)) {
        missingItems.push({
          subjectId: sub.id,
          subjectName: sub.name,
          periodCode: p.code,
          periodName: p.name,
          isExam: false,
          semester: 1,
        });
      }
    }

    // Track missing exam Sem 1
    const exam1Val = sem1ExamPeriod ? pScores[sem1ExamPeriod.code] : null;
    if (sem1ExamPeriod && (exam1Val === null || exam1Val === undefined || isNaN(exam1Val))) {
      missingItems.push({
        subjectId: sub.id,
        subjectName: sub.name,
        periodCode: sem1ExamPeriod.code,
        periodName: sem1ExamPeriod.name,
        isExam: true,
        semester: 1,
      });
    }

    // Track missing monthly periods Sem 2
    for (const p of sem2MonthlyPeriods) {
      const val = pScores[p.code];
      if (val === null || val === undefined || isNaN(val)) {
        missingItems.push({
          subjectId: sub.id,
          subjectName: sub.name,
          periodCode: p.code,
          periodName: p.name,
          isExam: false,
          semester: 2,
        });
      }
    }

    // Track missing exam Sem 2
    const exam2Val = sem2ExamPeriod ? pScores[sem2ExamPeriod.code] : null;
    if (sem2ExamPeriod && (exam2Val === null || exam2Val === undefined || isNaN(exam2Val))) {
      missingItems.push({
        subjectId: sub.id,
        subjectName: sub.name,
        periodCode: sem2ExamPeriod.code,
        periodName: sem2ExamPeriod.name,
        isExam: true,
        semester: 2,
      });
    }

    // Calculations
    const sem1Monthly = calculateMonthlyAverage(pScores, sem1MonthlyPeriods);
    const semester1 = calculateSemesterScore(sem1Monthly, exam1Val);

    if (semester1.isComplete && semester1.semesterScore !== null) {
      sem1Total += semester1.semesterScore;
      sem1ValidCount++;
    } else if (semester1.status === 'awaiting_exam') {
      sem1HasAwaitingExam = true;
    } else {
      sem1HasMissingMonthly = true;
    }

    const sem2Monthly = calculateMonthlyAverage(pScores, sem2MonthlyPeriods);
    const semester2 = calculateSemesterScore(sem2Monthly, exam2Val);

    if (semester2.isComplete && semester2.semesterScore !== null) {
      sem2Total += semester2.semesterScore;
      sem2ValidCount++;
    } else if (semester2.status === 'awaiting_exam') {
      sem2HasAwaitingExam = true;
    } else {
      sem2HasMissingMonthly = true;
    }

    const annual = calculateAnnualScore(semester1, semester2);
    if (annual.isComplete && annual.annualScore !== null) {
      annualTotal += annual.annualScore;
      annualValidCount++;
    }

    subjectResults[sub.id] = {
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      periodScores: pScores,
      sem1Monthly,
      exam1: exam1Val ?? null,
      semester1,
      sem2Monthly,
      exam2: exam2Val ?? null,
      semester2,
      annualScore: annual.annualScore,
      isAnnualComplete: annual.isComplete,
      annualStatus: annual.status,
      annualStatusLabel: annual.statusLabel,
    };
  }

  // Aggregates
  const totalSubCount = activeSubjects.length;

  // Sem 1 Summary
  const isSem1Complete = totalSubCount > 0 && sem1ValidCount === totalSubCount;
  const avgSem1 = sem1ValidCount > 0 ? sem1Total / sem1ValidCount : null;
  let statusSem1: StudentCalculatedSummary['statusSem1'] = 'complete';
  let statusSem1Label = 'ຄົບແລ້ວ';
  if (!isSem1Complete) {
    if (sem1HasAwaitingExam && !sem1HasMissingMonthly) {
      statusSem1 = 'awaiting_exam';
      statusSem1Label = 'ລໍຖ້າຄະແນນເສັງ';
    } else {
      statusSem1 = 'missing_scores';
      statusSem1Label = 'ຍັງຂາດຄະແນນ';
    }
  }

  // Sem 2 Summary
  const isSem2Complete = totalSubCount > 0 && sem2ValidCount === totalSubCount;
  const avgSem2 = sem2ValidCount > 0 ? sem2Total / sem2ValidCount : null;
  let statusSem2: StudentCalculatedSummary['statusSem2'] = 'complete';
  let statusSem2Label = 'ຄົບແລ້ວ';
  if (!isSem2Complete) {
    if (sem2HasAwaitingExam && !sem2HasMissingMonthly) {
      statusSem2 = 'awaiting_exam';
      statusSem2Label = 'ລໍຖ້າຄະແນນເສັງ';
    } else {
      statusSem2 = 'missing_scores';
      statusSem2Label = 'ຍັງຂາດຄະແນນ';
    }
  }

  // Annual Summary
  const isAnnualComplete = totalSubCount > 0 && annualValidCount === totalSubCount;
  const avgAnnual = annualValidCount > 0 ? annualTotal / annualValidCount : null;
  let statusAnnual: StudentCalculatedSummary['statusAnnual'] = 'complete';
  let statusAnnualLabel = 'ຄົບແລ້ວ';
  if (!isAnnualComplete) {
    if (statusSem1 === 'awaiting_exam' || statusSem2 === 'awaiting_exam') {
      statusAnnual = 'awaiting_exam';
      statusAnnualLabel = 'ລໍຖ້າຄະແນນເສັງ';
    } else {
      statusAnnual = 'missing_scores';
      statusAnnualLabel = 'ຍັງຂາດຄະແນນ';
    }
  }

  return {
    studentId,
    student: studentObj,
    subjectResults,

    totalSemester1: sem1ValidCount > 0 ? sem1Total : null,
    avgSemester1: avgSem1,
    validSubjectCountSem1: sem1ValidCount,
    isSemester1Complete: isSem1Complete,
    statusSem1,
    statusSem1Label,

    totalSemester2: sem2ValidCount > 0 ? sem2Total : null,
    avgSemester2: avgSem2,
    validSubjectCountSem2: sem2ValidCount,
    isSemester2Complete: isSem2Complete,
    statusSem2,
    statusSem2Label,

    totalAnnual: annualValidCount > 0 ? annualTotal : null,
    avgAnnual,
    validSubjectCountAnnual: annualValidCount,
    isAnnualComplete,
    statusAnnual,
    statusAnnualLabel,

    missingItems,
  };
}

/**
 * Builds nested scores lookup map from flat ScoreRecord[] list
 * Returns: studentId -> subjectId -> periodCode -> number
 */
export function buildNestedScoresMap(
  records: ScoreRecord[]
): Record<string, Record<string, Record<string, number | null>>> {
  const result: Record<string, Record<string, Record<string, number | null>>> = {};
  for (const r of records) {
    if (!result[r.studentId]) result[r.studentId] = {};
    if (!result[r.studentId][r.subjectId]) result[r.studentId][r.subjectId] = {};
    result[r.studentId][r.subjectId][r.periodId] = r.score;
  }
  return result;
}

/**
 * Convenient single-student summary calculator
 */
export function calculateStudentSummary(
  student: Student,
  subjects: Subject[],
  periods: ScorePeriod[],
  scores: ScoreRecord[]
): StudentCalculatedSummary {
  const map = buildNestedScoresMap(scores);
  const studentScores = map[student.id] || {};
  return calculateStudentSubjectScores(student.id, studentScores, subjects, periods, student);
}
