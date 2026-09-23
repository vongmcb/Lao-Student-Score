import React from 'react';
import {
  Student,
  ClassRoom,
  Subject,
  ScorePeriod,
  School,
  SchoolYear,
  AttendanceRecord,
  BehaviorRecord
} from '../../types';
import { PDFIndividualScoreReport } from './PDFIndividualScoreReport';
import { PDFTrackingBookReport } from './PDFTrackingBookReport';

interface PDFClassBatchReportProps {
  school: School | null;
  schoolYear: SchoolYear | null;
  classRoom: ClassRoom | null;
  batchType: 'individual' | 'tracking_book';
  students: Student[];
  subjects: Subject[];
  periods: ScorePeriod[];
  scoresMap: Record<string, Record<string, Record<string, number | null>>>;
  attendanceRecords?: AttendanceRecord[];
  behaviorRecords?: BehaviorRecord[];
  printedBy?: string;
}

export const PDFClassBatchReport: React.FC<PDFClassBatchReportProps> = ({
  school,
  schoolYear,
  classRoom,
  batchType,
  students,
  subjects,
  periods,
  scoresMap,
  attendanceRecords,
  behaviorRecords,
  printedBy
}) => {
  return (
    <div className="space-y-8">
      {students.map((student, idx) => (
        <div key={student.id} className="pdf-page page-break">
          {batchType === 'individual' ? (
            <PDFIndividualScoreReport
              school={school}
              schoolYear={schoolYear}
              classRoom={classRoom}
              student={student}
              allClassStudents={students}
              subjects={subjects}
              periods={periods}
              scoresMap={scoresMap}
              printedBy={printedBy}
            />
          ) : (
            <PDFTrackingBookReport
              school={school}
              schoolYear={schoolYear}
              classRoom={classRoom}
              student={student}
              allClassStudents={students}
              subjects={subjects}
              periods={periods}
              scoresMap={scoresMap}
              attendanceRecords={attendanceRecords}
              behaviorRecords={behaviorRecords}
              printedBy={printedBy}
            />
          )}
        </div>
      ))}
    </div>
  );
};
