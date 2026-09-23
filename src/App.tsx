import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './pages/LoginView';
import { DashboardView } from './pages/DashboardView';
import { StudentsView } from './pages/StudentsView';
import { SubjectsView } from './pages/SubjectsView';
import { ScoreEntryView } from './pages/ScoreEntryView';
import { AllScoreView } from './pages/AllScoreView';
import { StudentTrackingBookView } from './pages/StudentTrackingBookView';
import { ReportsView } from './pages/ReportsView';
import { SettingsAndSchoolView } from './pages/SettingsAndSchoolView';
import { GlobalSearchModal } from './components/GlobalSearchModal';

import {
  Home,
  Users,
  BookOpen,
  Edit3,
  BarChart2,
  BookMarked,
  FileText,
  Settings,
  LogOut,
  Search,
  Menu,
  X,
  GraduationCap,
  School as SchoolIcon,
  RefreshCw
} from 'lucide-react';

import {
  Student,
  ClassRoom,
  Subject,
  ScorePeriod,
  ScoreRecord,
  School,
  SchoolYear
} from './types';

import {
  getSchoolInfo,
  getSchoolYears,
  getClasses,
  getStudents,
  getSubjects,
  getScorePeriods,
  getScoresForClass
} from './services/dataService';

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();

  // Active Menu Tab state
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Global Data states
  const [school, setSchool] = useState<School | null>(null);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<ScorePeriod[]>([]);
  const [scores, setScores] = useState<ScoreRecord[]>([]);

  // Selected filters
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [trackedStudentId, setTrackedStudentId] = useState<string>('');
  const [targetScoreEntryStudentId, setTargetScoreEntryStudentId] = useState<string | undefined>(undefined);

  const handleNavigateToScoreEntry = (studentId: string, classId: string) => {
    setSelectedClassId(classId);
    setTargetScoreEntryStudentId(studentId);
    setActiveTab('score-entry');
  };

  // UI state
  const [dataLoading, setDataLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Load initial database data
  const loadData = async () => {
    setDataLoading(true);
    try {
      const [sch, years, cls, subs, pers] = await Promise.all([
        getSchoolInfo(),
        getSchoolYears(),
        getClasses(),
        getSubjects(),
        getScorePeriods()
      ]);

      setSchool(sch);
      setSchoolYears(years);
      setClasses(cls);
      setSubjects(subs);
      setPeriods(pers);

      const activeYear = years[0]?.id;
      const studs = await getStudents(undefined, activeYear);
      setStudents(studs);

      // Load scores for all classes
      const allClassScores: ScoreRecord[] = [];
      for (const c of cls) {
        const cScores = await getScoresForClass(c.id, c.schoolYearId);
        allClassScores.push(...cScores);
      }
      setScores(allClassScores);

      if (cls.length > 0 && selectedClassId === 'all') {
        setSelectedClassId(cls[0].id);
      }
      if (studs.length > 0 && !trackedStudentId) {
        setTrackedStudentId(studs[0].id);
      }
    } catch (err) {
      console.error('Error loading app data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium">ກຳລັງກວດສອບສະຖານະການເຂົ້າລະບົບ...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'students', label: 'ນັກຮຽນ', icon: Users },
    { id: 'subjects', label: 'ວິຊາ', icon: BookOpen },
    { id: 'score-entry', label: 'ປ້ອນຄະແນນ', icon: Edit3 },
    { id: 'all-score', label: 'All Score', icon: BarChart2 },
    { id: 'tracking-book', label: 'ປຶ້ມຕິດຕາມ', icon: BookMarked },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex font-lao text-slate-800">
      {/* Mobile Drawer Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Navigation (Desktop + Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } no-print`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white">Lao Student Score</div>
              <div className="text-2xs text-blue-400 font-medium">ລະບົບຈັດການຄະແນນ</div>
            </div>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden p-1 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Search trigger in sidebar */}
        <div className="px-4 py-3">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl text-xs flex items-center justify-between transition border border-slate-700/60"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5" /> ຄົ້ນຫານັກຮຽນ...
            </span>
            <kbd className="px-1.5 py-0.5 text-2xs bg-slate-700 rounded text-slate-300 font-mono">⌘K</kbd>
          </button>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile and Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate mr-2">
              <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                {user.displayName ? user.displayName.charAt(0) : 'T'}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-200 truncate">
                  {user.displayName || 'ອາຈານ'}
                </div>
                <div className="text-2xs text-slate-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition flex-shrink-0"
              title="ອອກຈາກລະບົບ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
        {/* Top Header for Mobile & Desktop */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 truncate">
              <SchoolIcon className="w-4 h-4 text-blue-700 flex-shrink-0" />
              <span className="truncate max-w-xs sm:max-w-md">
                {school?.name || 'ໂຮງຮຽນ ມັດທະຍົມສົມບູນ ວຽງຈັນ'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-xl"
              title="ຄົ້ນຫາ"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-xl"
              title="ໂຫຼດຂໍ້ມູນໃໝ່"
            >
              <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-20 md:pb-8">
          {dataLoading && (
            <div className="py-2 text-center text-xs text-blue-600 font-medium">
              ກຳລັງອັບເດດຂໍ້ມູນຈາກ Cloud Firestore...
            </div>
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              students={students}
              classes={classes}
              subjects={subjects}
              scores={scores}
              periods={periods}
              selectedClassId={selectedClassId}
              onSelectClass={(id) => setSelectedClassId(id)}
              onNavigate={(tab) => setActiveTab(tab)}
              onNavigateToScoreEntry={handleNavigateToScoreEntry}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              students={students}
              classes={classes}
              schoolYears={schoolYears}
              selectedClassId={selectedClassId}
              onSelectClass={(id) => setSelectedClassId(id)}
              onRefresh={loadData}
              onSelectStudentForTracking={(studentId) => {
                setTrackedStudentId(studentId);
                setActiveTab('tracking-book');
              }}
              onNavigateToScoreEntry={handleNavigateToScoreEntry}
              onExportIndividualPDF={(st) => {
                setTrackedStudentId(st.id);
                setActiveTab('reports');
              }}
              scores={scores}
              subjects={subjects}
              periods={periods}
            />
          )}

          {activeTab === 'subjects' && (
            <SubjectsView
              subjects={subjects}
              onRefresh={loadData}
            />
          )}

          {activeTab === 'score-entry' && (
            <ScoreEntryView
              students={students}
              classes={classes}
              subjects={subjects}
              periods={periods}
              schoolYears={schoolYears}
              scores={scores}
              selectedClassId={selectedClassId}
              targetStudentId={targetScoreEntryStudentId}
              onRefreshScores={loadData}
            />
          )}

          {activeTab === 'all-score' && (
            <AllScoreView
              students={students}
              classes={classes}
              subjects={subjects}
              periods={periods}
              scores={scores}
              schoolYears={schoolYears}
              selectedClassId={selectedClassId}
              onSelectClass={(id) => setSelectedClassId(id)}
              onNavigateToScoreEntry={handleNavigateToScoreEntry}
              onSelectStudentForTracking={(studentId) => {
                setTrackedStudentId(studentId);
                setActiveTab('tracking-book');
              }}
            />
          )}

          {activeTab === 'tracking-book' && (
            <StudentTrackingBookView
              students={students}
              classes={classes}
              subjects={subjects}
              periods={periods}
              scores={scores}
              schoolYears={schoolYears}
              schoolInfo={school}
              selectedStudentId={trackedStudentId}
              onSelectStudent={(id) => setTrackedStudentId(id)}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              students={students}
              classes={classes}
              subjects={subjects}
              periods={periods}
              scores={scores}
              school={school}
              schoolYears={schoolYears}
              currentUserEmail={user?.email || undefined}
              onNavigateToStudentTracking={(sId) => {
                setTrackedStudentId(sId);
                setActiveTab('tracking-book');
              }}
              onNavigateToAllScore={() => setActiveTab('all-score')}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsAndSchoolView
              school={school}
              schoolYears={schoolYears}
              classes={classes}
              onRefresh={loadData}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around no-print shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-2xs ${
              activeTab === 'dashboard' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('score-entry')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-2xs ${
              activeTab === 'score-entry' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Edit3 className="w-5 h-5 mb-0.5" />
            <span>ປ້ອນຄະແນນ</span>
          </button>

          <button
            onClick={() => setActiveTab('all-score')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-2xs ${
              activeTab === 'all-score' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <BarChart2 className="w-5 h-5 mb-0.5" />
            <span>All Score</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-2xs ${
              activeTab === 'students' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Users className="w-5 h-5 mb-0.5" />
            <span>ນັກຮຽນ</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-1 px-2 rounded-lg text-2xs ${
              activeTab === 'settings' ? 'text-blue-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        students={students}
        classes={classes}
        onSelectStudent={(studentId) => {
          setTrackedStudentId(studentId);
          setActiveTab('tracking-book');
        }}
        onNavigateToScoreEntry={handleNavigateToScoreEntry}
      />
    </div>
  );
}
