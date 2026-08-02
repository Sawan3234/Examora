import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { examAPI, sessionAPI, userAPI } from '../../api/services';
import { Header } from '../../components/Layout/Header.jsx';
import { showToast } from '../../hooks/useToast';
import { CreateExamModel } from '../../components/UI/CreateExamModel.jsx';
import { Users, Eye, AlertTriangle, BookOpen, LayoutList, Plus, Shield, ShieldX, Clock, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const AVATAR_COLORS = [
  { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-200 dark:ring-teal-700' },
  { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-200 dark:ring-blue-700' },
  { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-200 dark:ring-purple-700' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40', text: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-200 dark:ring-rose-700' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-200 dark:ring-amber-700' },
  { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-700 dark:text-green-300', ring: 'ring-green-200 dark:ring-green-700' },
];

function getAvatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name = '') {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';
}

/* ── Violation timeline accordion ── */
function ViolationAccordion({ violations }) {
  const [open, setOpen] = useState(false);
  const count = violations?.length || 0;

  if (count === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Shield className="w-4 h-4 text-slate-300 dark:text-slate-600" />
        <span className="text-sm text-slate-400 dark:text-slate-500">No violations</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800">
      {/* Trigger row */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
          open
            ? 'bg-red-50 dark:bg-red-900/20'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
        }`}
      >
        <ShieldX className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0" />
        <span className="text-sm font-medium text-red-600 dark:text-red-400 flex-1">
          Violations
        </span>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
          {count}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
      </button>

      {/* Timeline dropdown */}
      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 max-h-64 overflow-y-auto bg-slate-50 dark:bg-slate-800/40">
          {violations.map((v, i) => {
            const severity = v.severity || (v.type === 'tab_switch' ? 'high' : v.type === 'copy_attempt' ? 'medium' : 'low');
            const dotColor =
              severity === 'high' ? 'bg-red-500' :
              severity === 'medium' ? 'bg-amber-400' :
              'bg-green-500';
            const tagStyle =
              severity === 'high'
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                : severity === 'medium'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';

            return (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
                {/* Spine */}
                <div className="flex flex-col items-center pt-1 flex-shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                  {i < violations.length - 1 && (
                    <div className="w-px flex-1 min-h-[18px] bg-slate-200 dark:bg-slate-700 mt-1" />
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 capitalize">
                      {(v.type || 'unknown').replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tagStyle}`}>
                      {severity}
                    </span>
                  </div>
                  {v.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{v.description}</p>
                  )}
                  {v.timestamp && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(v.timestamp).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Student detail modal ── */
function StudentModal({ student, sessions, onClose }) {
  const navigate = useNavigate();
  const color = getAvatarColor(student.name);
  const totalViolations = sessions.reduce((sum, s) => sum + (s.violations?.length || 0), 0);
  const passed = sessions.filter(s => s.score !== null && s.score >= (s.exam?.passingScore || 0)).length;
  const passRate = sessions.length > 0 ? Math.round((passed / sessions.length) * 100) : 0;

  const backdropRef = useRef(null);
  const handleBackdrop = (e) => { if (e.target === backdropRef.current) onClose(); };

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold flex-shrink-0 ring-2 ${color.bg} ${color.text} ${color.ring}`}>
            {getInitials(student.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-slate-900 dark:text-white">{student.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{sessions.length} exam{sessions.length !== 1 ? 's' : ''} · {student.email || 'no email'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
          <div className="py-3 text-center">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">{sessions.length}</p>
            <p className="text-xs text-slate-400">exams</p>
          </div>
          <div className="py-3 text-center">
            <p className={`text-lg font-semibold ${passRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{passRate}%</p>
            <p className="text-xs text-slate-400">pass rate</p>
          </div>
          <div className="py-3 text-center">
            <p className={`text-lg font-semibold ${totalViolations > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{totalViolations}</p>
            <p className="text-xs text-slate-400">violations</p>
          </div>
        </div>

        {/* Exam list */}
        <div className="flex-1 overflow-y-auto">
          <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">exam history</p>
          {sessions.length === 0 ? (
            <p className="px-5 py-4 text-sm text-slate-400">no exams yet</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4">
              {sessions.map((session) => {
                const statusColor =
                  session.status === 'completed' ? 'bg-green-500/15 text-green-600 dark:text-green-400' :
                  session.status === 'in_progress' ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' :
                  session.status === 'flagged' ? 'bg-red-500/15 text-red-600 dark:text-red-400' :
                  'bg-slate-500/15 text-slate-500 dark:text-slate-400';
                return (
                  <div key={session._id} className="py-3">
                    {/* Exam row */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {session.exam?.title || 'N/A'}
                        </p>
                        {session.score !== null && session.score !== undefined && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">score: {session.score}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusColor}`}>
                        {session.status}
                      </span>
                    </div>
                    {/* Violation accordion directly under the exam row */}
                    <ViolationAccordion violations={session.violations} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer removed per request (buttons: close, view full profile) */}
      </div>
    </div>
  );
}

/* ── Delete student confirmation modal ── */
function DeleteStudentModal({ student, isDeleting, onCancel, onConfirm }) {
  const backdropRef = useRef(null);

  const handleBackdrop = (e) => {
    if (e.target === backdropRef.current && !isDeleting) {
      onCancel();
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !isDeleting) onCancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isDeleting, onCancel]);

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FCEBEB] text-[#A32D2D]">
            <Trash2 className="h-5 w-5" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Delete {student?.name}?
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            This will permanently remove the student and all their exam records. This cannot be undone.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: '#E24B4A' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Student card (grid tile) ── */
function StudentCard({ student, sessions, onClick, onDelete }) {
  const color = getAvatarColor(student.name);
  const totalViolations = sessions.reduce((sum, s) => sum + (s.violations?.length || 0), 0);
  const passed = sessions.filter(s => s.score !== null && s.score >= (s.exam?.passingScore || 0)).length;
  const passRate = sessions.length > 0 ? Math.round((passed / sessions.length) * 100) : 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="relative bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden text-left hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all w-full group cursor-pointer"
    >
      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          title="Delete student"
          aria-label={`Delete ${student.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="inline-flex h-7 w-7 items-center justify-center text-[#A32D2D] transition-opacity hover:opacity-80"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-3 p-4 pr-12">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ring-2 ${color.bg} ${color.text} ${color.ring}`}>
          {getInitials(student.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{student.name}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500">{sessions.length} exam{sessions.length !== 1 ? 's' : ''} taken</p>
        </div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-700 border-t border-slate-100 dark:border-slate-700">
        <div className="py-2.5 text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{sessions.length}</p>
          <p className="text-xs text-slate-400">exams</p>
        </div>
        <div className="py-2.5 text-center">
          <p className={`text-sm font-semibold ${passRate >= 50 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>{passRate}%</p>
          <p className="text-xs text-slate-400">pass rate</p>
        </div>
        <div className="py-2.5 text-center">
          <p className={`text-sm font-semibold ${totalViolations > 0 ? 'text-red-500 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>{totalViolations}</p>
          <p className="text-xs text-slate-400">violations</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main dashboard ── */
export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('sessions');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [isDeletingStudent, setIsDeletingStudent] = useState(false);
  const [stats, setStats] = useState({ totalExams: 0, totalStudents: 0, activeSessions: 0, violations: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [studentMap, setStudentMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchStats();
    fetchRecentSessions();
  }, []);

  const fetchStats = async () => {
    try {
      const [examsRes, sessionsRes] = await Promise.all([examAPI.list(), sessionAPI.list()]);
      const sessions = sessionsRes.data.sessions || [];
      const totalViolations = sessions.reduce((sum, s) => sum + (s.violations?.length || 0), 0);
      const uniqueStudents = new Map();
      sessions.forEach(s => { if (s.student?._id) uniqueStudents.set(s.student._id, s.student); });
      setStats({
        totalExams: examsRes.data.exams?.length || 0,
        totalStudents: uniqueStudents.size,
        activeSessions: sessions.filter(s => s.status === 'in_progress').length,
        violations: totalViolations,
      });
    } catch (err) { console.error('Error fetching stats:', err); }
  };

  const fetchRecentSessions = async () => {
    try {
      const res = await sessionAPI.list();
      const sessions = res.data.sessions || [];
      setRecentSessions(sessions.slice(0, 5));
      const map = {};
      sessions.forEach(session => {
        const id = session.student?._id;
        if (!id) return;
        if (!map[id]) map[id] = { student: session.student, sessions: [] };
        map[id].sessions.push(session);
      });
      setStudentMap(map);
    } catch (err) { console.error('Error fetching sessions:', err); }
  };

  const handleCreateExam = async (examData) => {
    try {
      const backendExam = {
        title: examData.title, description: examData.description, type: examData.type,
        duration: examData.duration, passingScore: examData.passingScore, status: 'active',
        scheduledAt: examData.scheduledAt, generalInstructions: examData.generalInstructions,
        proctoringRules: examData.proctoringRules, questions: examData.questions,
      };
      await examAPI.create(backendExam);
      await fetchStats();
      setIsCreateModalOpen(false);
      showToast('success', 'Exam created successfully!', 'The exam has been created.');
    } catch (err) {
      console.error('Failed to create exam:', err);
      showToast('error', 'Error creating exam', err.response?.data?.message || 'Failed to create exam');
    }
  };

  const filteredStudents = Object.values(studentMap).filter(({ student }) =>
    student.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteStudent = async () => {
    if (!studentToDelete?.student?._id || isDeletingStudent) return;

    setIsDeletingStudent(true);
    try {
      const { data } = await userAPI.deleteStudent(studentToDelete.student._id);
      const deletedStudentId = data.deletedStudentId || studentToDelete.student._id;
      const deletedViolationsCount = data.deletedViolationsCount || 0;

      setStudentMap((current) => {
        const next = { ...current };
        delete next[deletedStudentId];
        return next;
      });

      setRecentSessions((current) => current.filter((session) => session.student?._id !== deletedStudentId));

      setStats((current) => ({
        ...current,
        totalStudents: Math.max(0, current.totalStudents - 1),
        violations: Math.max(0, current.violations - deletedViolationsCount),
      }));

      if (selectedStudent?.student?._id === deletedStudentId) {
        setSelectedStudent(null);
      }

      setStudentToDelete(null);
      showToast('success', 'Student deleted successfully');
    } catch (err) {
      console.error('Failed to delete student:', err);
      showToast('error', 'Failed to delete student. Please try again.');
    } finally {
      setIsDeletingStudent(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900">
      <Header adminName={user?.name || 'Admin'} adminEmail={user?.email} />

      <div className="p-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <BookOpen className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalExams}</p>
            <p className="text-slate-600 dark:text-slate-400">Total Exams</p>
          </div>
          <button
            onClick={() => setActiveTab('students')}
            className={`bg-white dark:bg-slate-800/50 border rounded-xl p-6 text-left transition-all hover:border-blue-400 dark:hover:border-blue-500 ${
              activeTab === 'students' ? 'border-blue-400 dark:border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/40' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <Users className="w-8 h-8 text-green-500 dark:text-green-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalStudents}</p>
            <p className="text-slate-600 dark:text-slate-400">Total Students</p>
          </button>
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <Eye className="w-8 h-8 text-purple-500 dark:text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeSessions}</p>
            <p className="text-slate-600 dark:text-slate-400">Active Sessions</p>
          </div>
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <AlertTriangle className="w-8 h-8 text-yellow-500 dark:text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.violations}</p>
            <p className="text-slate-600 dark:text-slate-400">Total Violations</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => navigate('/admin/exams')}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-electric to-blue-600 text-white font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-electric/50 hover:opacity-90 transition-all"
          >
            <LayoutList className="w-5 h-5" strokeWidth={1.8} />
            <span>Manage Exams</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200 dark:border-slate-700 mb-6">
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'sessions' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Recent Sessions
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              activeTab === 'students' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            Students
            {stats.totalStudents > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">{stats.totalStudents}</span>
            )}
          </button>
        </div>

        {/* Recent Sessions Tab */}
        {activeTab === 'sessions' && recentSessions.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Recent Exam Sessions</h2>
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Student</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Exam</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Violations</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {recentSessions.map((session) => {
                    const count = session.violations?.length || 0;
                    return (
                      <tr key={session._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                        <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{session.student?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{session.exam?.title || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            session.status === 'completed' ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                            session.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                            session.status === 'flagged' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                            'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                          }`}>{session.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {count === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
                              <Shield className="w-3 h-3" /> 0
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                              <ShieldX className="w-3 h-3" /> {count}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <button
                            onClick={() => navigate(`/admin/sessions/${session._id}`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">All Students</h2>
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="search students..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 w-36"
                />
              </div>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 dark:text-slate-500 text-sm">
                  {searchQuery ? 'no students match your search' : 'no students yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map(({ student, sessions }) => (
                  <StudentCard
                    key={student._id}
                    student={student}
                    sessions={sessions}
                    onClick={() => setSelectedStudent({ student, sessions })}
                    onDelete={() => setStudentToDelete({ student, sessions })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Student detail modal */}
      {selectedStudent && (
        <StudentModal
          student={selectedStudent.student}
          sessions={selectedStudent.sessions}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {studentToDelete && (
        <DeleteStudentModal
          student={studentToDelete.student}
          isDeleting={isDeletingStudent}
          onCancel={() => !isDeletingStudent && setStudentToDelete(null)}
          onConfirm={handleDeleteStudent}
        />
      )}

      {/* Create Exam Modal */}
      <CreateExamModel
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateExam}
      />

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsCreateModalOpen(true)}
        aria-label="Add session"
        className="floating-glow fixed bottom-8 right-8 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white transition-colors hover:bg-violet-700 hover:shadow-[0_0_36px_rgba(168,85,247,0.55)] hover:brightness-110 sm:h-16 sm:w-16"
      >
        <Plus className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2.5} />
      </button>
    </div>
  );
}