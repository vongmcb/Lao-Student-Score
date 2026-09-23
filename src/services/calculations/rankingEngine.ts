import { StudentCalculatedSummary } from './scoreEngine';

export interface RankedStudentSummary extends StudentCalculatedSummary {
  rankSem1: number | null;
  rankSem2: number | null;
  rankAnnual: number | null;
}

export interface SubjectRankingItem {
  studentId: string;
  studentName: string;
  rollNumber: number;
  className: string;
  grade: string;
  score: number | null;
  statusLabel: string;
  isComplete: boolean;
  rank: number | null;
}

/**
 * Generic Competition Ranking algorithm (1, 2, 2, 4):
 * - Sorts items descending by score.
 * - Incomplete items (isComplete === false or score === null) are assigned null rank.
 * - Tied scores receive the exact same rank.
 * - The subsequent rank skips according to the number of tied positions.
 */
export function assignCompetitionRanks<T>(
  items: T[],
  getScore: (item: T) => number | null,
  isComplete: (item: T) => boolean
): { item: T; rank: number | null }[] {
  // Separate complete vs incomplete
  const completeList: { item: T; score: number }[] = [];
  const incompleteList: { item: T }[] = [];

  for (const it of items) {
    const score = getScore(it);
    if (isComplete(it) && score !== null && !isNaN(score)) {
      completeList.push({ item: it, score });
    } else {
      incompleteList.push({ item: it });
    }
  }

  // Sort descending by score. For equal scores, keep stable order
  completeList.sort((a, b) => b.score - a.score);

  const rankedComplete: { item: T; rank: number | null }[] = [];
  let currentRank = 1;

  for (let i = 0; i < completeList.length; i++) {
    if (i > 0 && Math.abs(completeList[i].score - completeList[i - 1].score) < 0.0001) {
      // Tied with previous item -> same rank
      rankedComplete.push({
        item: completeList[i].item,
        rank: rankedComplete[i - 1].rank,
      });
    } else {
      // New distinct score -> rank equals 1-based position in sorted list (1, 2, 2, 4...)
      currentRank = i + 1;
      rankedComplete.push({
        item: completeList[i].item,
        rank: currentRank,
      });
    }
  }

  // Combine with incomplete items which receive rank: null
  const rankedIncomplete: { item: T; rank: number | null }[] = incompleteList.map(it => ({
    item: it.item,
    rank: null,
  }));

  // Create lookup map to maintain original input ordering if desired
  const resultMap = new Map<T, number | null>();
  for (const r of rankedComplete) resultMap.set(r.item, r.rank);
  for (const r of rankedIncomplete) resultMap.set(r.item, r.rank);

  return items.map(it => ({
    item: it,
    rank: resultMap.get(it) ?? null,
  }));
}

/**
 * Calculates Semester 1, Semester 2, and Annual competition ranks for a classroom list
 */
export function calculateClassStudentRankings(
  summaries: StudentCalculatedSummary[]
): RankedStudentSummary[] {
  // 1. Semester 1 Ranks
  const sem1Ranked = assignCompetitionRanks(
    summaries,
    s => s.avgSemester1,
    s => s.isSemester1Complete
  );
  const sem1RankMap = new Map<string, number | null>();
  sem1Ranked.forEach(r => sem1RankMap.set(r.item.studentId, r.rank));

  // 2. Semester 2 Ranks
  const sem2Ranked = assignCompetitionRanks(
    summaries,
    s => s.avgSemester2,
    s => s.isSemester2Complete
  );
  const sem2RankMap = new Map<string, number | null>();
  sem2Ranked.forEach(r => sem2RankMap.set(r.item.studentId, r.rank));

  // 3. Annual Ranks
  const annualRanked = assignCompetitionRanks(
    summaries,
    s => s.avgAnnual,
    s => s.isAnnualComplete
  );
  const annualRankMap = new Map<string, number | null>();
  annualRanked.forEach(r => annualRankMap.set(r.item.studentId, r.rank));

  return summaries.map(s => ({
    ...s,
    rankSem1: sem1RankMap.get(s.studentId) ?? null,
    rankSem2: sem2RankMap.get(s.studentId) ?? null,
    rankAnnual: annualRankMap.get(s.studentId) ?? null,
  }));
}

/**
 * Calculates subject-specific ranking across students in a class or grade
 * for a given subject and scope ('semester1' | 'semester2' | 'annual')
 */
export function calculateSubjectRankings(
  summaries: StudentCalculatedSummary[],
  subjectId: string,
  scope: 'semester1' | 'semester2' | 'annual',
  className: string = '',
  grade: string = ''
): SubjectRankingItem[] {
  const items = summaries.map(s => {
    const subResult = s.subjectResults[subjectId];
    let score: number | null = null;
    let isComplete = false;
    let statusLabel = 'ຍັງບໍ່ມີຂໍ້ມູນ';

    if (subResult) {
      if (scope === 'semester1') {
        score = subResult.semester1.semesterScore;
        isComplete = subResult.semester1.isComplete;
        statusLabel = subResult.semester1.statusLabel;
      } else if (scope === 'semester2') {
        score = subResult.semester2.semesterScore;
        isComplete = subResult.semester2.isComplete;
        statusLabel = subResult.semester2.statusLabel;
      } else {
        score = subResult.annualScore;
        isComplete = subResult.isAnnualComplete;
        statusLabel = subResult.annualStatusLabel;
      }
    }

    const studentName = s.student
      ? `${s.student.title} ${s.student.firstName} ${s.student.lastName}`
      : s.studentId;

    return {
      studentId: s.studentId,
      studentName,
      rollNumber: s.student?.rollNumber ?? 0,
      className,
      grade,
      score,
      isComplete,
      statusLabel,
    };
  });

  const ranked = assignCompetitionRanks(
    items,
    item => item.score,
    item => item.isComplete
  );

  return ranked.map(r => ({
    ...r.item,
    rank: r.rank,
  })).sort((a, b) => {
    // Put ranked items first sorted by rank, then unranked by rollNumber
    if (a.rank !== null && b.rank !== null) return a.rank - b.rank;
    if (a.rank !== null) return -1;
    if (b.rank !== null) return 1;
    return a.rollNumber - b.rollNumber;
  });
}
