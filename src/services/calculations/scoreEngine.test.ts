import {
  calculateMonthlyAverage,
  calculateSemesterScore,
  calculateAnnualScore,
  calculateStudentSubjectScores,
  validateScore,
  formatScore,
} from './scoreEngine';
import { assignCompetitionRanks, calculateClassStudentRankings } from './rankingEngine';
import { ScorePeriod, Subject } from '../../types';

function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING LAO STUDENT SCORE ENGINE UNIT TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      if (details) console.error(`   Details: ${details}`);
      failed++;
    }
  }

  // Mock standard periods
  const mockPeriods: ScorePeriod[] = [
    { id: '09', code: '09', name: 'ເດືອນ 9', semester: 1, isExam: false, order: 1 },
    { id: '10', code: '10', name: 'ເດືອນ 10', semester: 1, isExam: false, order: 2 },
    { id: '11', code: '11', name: 'ເດືອນ 11', semester: 1, isExam: false, order: 3 },
    { id: '12', code: '12', name: 'ເດືອນ 12', semester: 1, isExam: false, order: 4 },
    { id: 'exam1', code: 'exam1', name: 'ເສັງພາກ I', semester: 1, isExam: true, order: 5 },
    { id: '02', code: '02', name: 'ເດືອນ 2', semester: 2, isExam: false, order: 6 },
    { id: '03', code: '03', name: 'ເດືອນ 3', semester: 2, isExam: false, order: 7 },
    { id: '04', code: '04', name: 'ເດືອນ 4', semester: 2, isExam: false, order: 8 },
    { id: '05', code: '05', name: 'ເດືອນ 5', semester: 2, isExam: false, order: 9 },
    { id: 'exam2', code: 'exam2', name: 'ເສັງພາກ II', semester: 2, isExam: true, order: 10 },
  ];

  const sem1MonthlyPeriods = mockPeriods.filter(p => p.semester === 1 && !p.isExam);
  const sem2MonthlyPeriods = mockPeriods.filter(p => p.semester === 2 && !p.isExam);

  // TEST 1: User Specification Exact Math Example
  // 09 = 8, 10 = 9, 11 = 7, 12 = 8 -> Monthly Avg I = 8
  // EXAM I = 9 -> Semester I = (8 + 9) / 2 = 8.5
  // 02 = 8, 03 = 8, 04 = 9, 05 = 9 -> Monthly Avg II = 8.5
  // EXAM II = 9 -> Semester II = (8.5 + 9) / 2 = 8.75
  // Annual = (8.5 + 8.75) / 2 = 8.625 -> Formats to 8.63
  console.log('--- Test Suite 1: Specification Math Example ---');
  const sem1Scores = { '09': 8, '10': 9, '11': 7, '12': 8 };
  const sem1Monthly = calculateMonthlyAverage(sem1Scores, sem1MonthlyPeriods);
  assert(sem1Monthly.isComplete === true, 'Semester 1 monthly is complete');
  assert(sem1Monthly.monthlyAvg === 8, 'Semester 1 monthly average equals 8', `Got ${sem1Monthly.monthlyAvg}`);

  const sem1Calc = calculateSemesterScore(sem1Monthly, 9);
  assert(sem1Calc.isComplete === true, 'Semester 1 score is complete');
  assert(sem1Calc.semesterScore === 8.5, 'Semester 1 score equals 8.50', `Got ${sem1Calc.semesterScore}`);

  const sem2Scores = { '02': 8, '03': 8, '04': 9, '05': 9 };
  const sem2Monthly = calculateMonthlyAverage(sem2Scores, sem2MonthlyPeriods);
  assert(sem2Monthly.isComplete === true, 'Semester 2 monthly is complete');
  assert(sem2Monthly.monthlyAvg === 8.5, 'Semester 2 monthly average equals 8.5', `Got ${sem2Monthly.monthlyAvg}`);

  const sem2Calc = calculateSemesterScore(sem2Monthly, 9);
  assert(sem2Calc.isComplete === true, 'Semester 2 score is complete');
  assert(sem2Calc.semesterScore === 8.75, 'Semester 2 score equals 8.75', `Got ${sem2Calc.semesterScore}`);

  const annualCalc = calculateAnnualScore(sem1Calc, sem2Calc);
  assert(annualCalc.isComplete === true, 'Annual score is complete');
  assert(annualCalc.annualScore === 8.625, 'Annual raw score equals 8.625', `Got ${annualCalc.annualScore}`);
  assert(formatScore(annualCalc.annualScore) === '8.63', 'Annual formatted score displays 8.63', `Got ${formatScore(annualCalc.annualScore)}`);

  // TEST 2: Missing Score Rules (Never treat as 0, show "ຍັງບໍ່ຄົບ")
  console.log('\n--- Test Suite 2: Missing Scores and Edge Cases ---');
  const incompleteSem1Scores = { '09': 8, '10': 9, '11': null, '12': 8 };
  const incMonthly = calculateMonthlyAverage(incompleteSem1Scores, sem1MonthlyPeriods);
  assert(incMonthly.isComplete === false, 'Incomplete monthly returns isComplete = false');
  assert(incMonthly.monthlyAvg === null, 'Incomplete monthly average is null (not defaulted to 0)');
  assert(incMonthly.statusLabel === 'ຍັງບໍ່ຄົບ', 'Incomplete monthly status label is "ຍັງບໍ່ຄົບ"');
  assert(incMonthly.missingCodes.includes('11'), 'Correctly identifies missing month 11');

  const incSemCalc = calculateSemesterScore(incMonthly, 9);
  assert(incSemCalc.isComplete === false, 'Cannot calculate semester score with missing monthly score');
  assert(incSemCalc.semesterScore === null, 'Incomplete semester score is null');
  assert(incSemCalc.statusLabel === 'ຍັງບໍ່ຄົບ', 'Incomplete semester status is "ຍັງບໍ່ຄົບ"');

  // TEST 3: Awaiting Exam Score ("ລໍຖ້າຄະແນນເສັງ")
  console.log('\n--- Test Suite 3: Awaiting Exam Score ---');
  const awaitingExamCalc = calculateSemesterScore(sem1Monthly, null);
  assert(awaitingExamCalc.isComplete === false, 'Semester without exam is not complete');
  assert(awaitingExamCalc.status === 'awaiting_exam', 'Status is awaiting_exam');
  assert(awaitingExamCalc.statusLabel === 'ລໍຖ້າຄະແນນເສັງ', 'Status label is "ລໍຖ້າຄະແນນເສັງ"');

  // TEST 4: Annual Score with one incomplete semester ("ຍັງບໍ່ສຳເລັດ")
  console.log('\n--- Test Suite 4: Incomplete Annual Score ---');
  const incAnnualCalc = calculateAnnualScore(sem1Calc, incSemCalc);
  assert(incAnnualCalc.isComplete === false, 'Annual score with incomplete Sem 2 is not complete');
  assert(incAnnualCalc.annualScore === null, 'Incomplete annual score is null');
  assert(incAnnualCalc.statusLabel === 'ຍັງບໍ່ສຳເລັດ', 'Incomplete annual status label is "ຍັງບໍ່ສຳເລັດ"');
  assert(formatScore(incAnnualCalc.annualScore) === '—', 'Formatting null annual score displays "—"');

  // TEST 5: Competition Ranking (1, 2, 2, 4)
  console.log('\n--- Test Suite 5: Competition Ranking Algorithm (1, 2, 2, 4) ---');
  const studentRankItems = [
    { id: 'st1', name: 'Student 1', score: 9.5, isComplete: true },
    { id: 'st2', name: 'Student 2', score: 9.0, isComplete: true },
    { id: 'st3', name: 'Student 3', score: 9.0, isComplete: true }, // tied with st2
    { id: 'st4', name: 'Student 4', score: 8.5, isComplete: true }, // should be rank 4!
    { id: 'st5', name: 'Student 5', score: null, isComplete: false }, // incomplete -> rank null
  ];

  const ranked = assignCompetitionRanks(
    studentRankItems,
    s => s.score,
    s => s.isComplete
  );

  const rankById = new Map(ranked.map(r => [r.item.id, r.rank]));
  assert(rankById.get('st1') === 1, 'Top student is Rank 1');
  assert(rankById.get('st2') === 2, 'Tied student 2 is Rank 2');
  assert(rankById.get('st3') === 2, 'Tied student 3 is Rank 2');
  assert(rankById.get('st4') === 4, 'Fourth student is Rank 4 (skips 3 due to tie)');
  assert(rankById.get('st5') === null, 'Incomplete student gets Rank null ("—")');

  // TEST 6: Validation Bounds [0, 10]
  console.log('\n--- Test Suite 6: Validation Bounds [0, 10] ---');
  assert(validateScore(10).isValid === true, '10 is valid score');
  assert(validateScore(0).isValid === true, '0 is valid score');
  assert(validateScore(8.75).isValid === true, '8.75 is valid score');
  assert(validateScore(-1).isValid === false, '-1 is rejected (< 0)');
  assert(validateScore(10.5).isValid === false, '10.5 is rejected (> 10)');
  assert(validateScore('abc').isValid === false, '"abc" is rejected (non-numeric)');
  assert(validateScore('').isValid === true && validateScore('').parsedValue === null, 'Empty string is treated as null draft');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
