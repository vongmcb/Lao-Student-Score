// Re-export new primary calculation and ranking engines
export * from '../services/calculations/scoreEngine';
export * from '../services/calculations/rankingEngine';

import { Subject, ScorePeriod } from '../types';
import {
  calculateMonthlyAverage,
  calculateSemesterScore,
  calculateAnnualScore,
  validateScore,
  formatScore,
  SubjectScoreCalculation
} from '../services/calculations/scoreEngine';

export interface StudentScoreMap {
  [periodCode: string]: number | null;
}

export interface StudentSubjectCalculations {
  monthlyAvg1: number | null;
  exam1: number | null;
  semester1: number | null;
  monthlyAvg2: number | null;
  exam2: number | null;
  semester2: number | null;
  annualAvg: number | null;
}

export interface StudentSummary {
  studentId: string;
  subjectResults: {
    [subjectId: string]: StudentSubjectCalculations;
  };
  totalSemester1: number;
  avgSemester1: number | null;
  totalSemester2: number;
  avgSemester2: number | null;
  totalAnnual: number;
  avgAnnual: number | null;
  rank?: number;
}

/**
 * Backwards compatible calculateSubjectScores using the new robust rules
 */
export function calculateSubjectScores(scoresMap: StudentScoreMap): StudentSubjectCalculations {
  const m1Periods: ScorePeriod[] = [
    { id: '09', code: '09', name: 'ເດືອນ 9', semester: 1, isExam: false, order: 1 },
    { id: '10', code: '10', name: 'ເດືອນ 10', semester: 1, isExam: false, order: 2 },
    { id: '11', code: '11', name: 'ເດືອນ 11', semester: 1, isExam: false, order: 3 },
    { id: '12', code: '12', name: 'ເດືອນ 12', semester: 1, isExam: false, order: 4 },
  ];
  const m2Periods: ScorePeriod[] = [
    { id: '02', code: '02', name: 'ເດືອນ 2', semester: 2, isExam: false, order: 6 },
    { id: '03', code: '03', name: 'ເດືອນ 3', semester: 2, isExam: false, order: 7 },
    { id: '04', code: '04', name: 'ເດືອນ 4', semester: 2, isExam: false, order: 8 },
    { id: '05', code: '05', name: 'ເດືອນ 5', semester: 2, isExam: false, order: 9 },
  ];

  const m1 = calculateMonthlyAverage(scoresMap, m1Periods);
  const exam1 = scoresMap['exam1'] !== undefined ? scoresMap['exam1'] : null;
  const s1 = calculateSemesterScore(m1, exam1);

  const m2 = calculateMonthlyAverage(scoresMap, m2Periods);
  const exam2 = scoresMap['exam2'] !== undefined ? scoresMap['exam2'] : null;
  const s2 = calculateSemesterScore(m2, exam2);

  const annual = calculateAnnualScore(s1, s2);

  return {
    monthlyAvg1: m1.monthlyAvg,
    exam1,
    semester1: s1.semesterScore,
    monthlyAvg2: m2.monthlyAvg,
    exam2,
    semester2: s2.semesterScore,
    annualAvg: annual.annualScore,
  };
}
