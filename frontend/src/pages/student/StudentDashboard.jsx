import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { examAPI, sessionAPI, userAPI } from '../../api/services';
import { BookOpen, Clock, Award, LogOut, Sun, Moon, ChevronDown } from 'lucide-react';
import { showToast } from '../../hooks/useToast';

export default function StudentDashboard() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [faceStatus, setFaceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedSession, setExpandedSession] = useState(null);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains('dark')
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [examsRes, sessionsRes, faceRes] = await Promise.all([
        examAPI.list(),
        sessionAPI.list(),
        userAPI.getFaceStatus()
      ]);
      setExams(examsRes.data.exams || []);
      const allSessions = sessionsRes.data.sessions || [];
      setSessions(allSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setFaceStatus(faceRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDark((prev) => !prev);
  };

  const handleStartExam = async (examId) => {
    if (!faceStatus?.faceRegistered) {
      showToast('warning', 'Register face', 'Please register your face first before taking exams');
      navigate('/face-register');
      return;
    }
    try {
      const res = await sessionAPI.start(examId);
      navigate(`/student/exam/${res.data.session._id}`);
    } catch (err) {
      console.error('Error starting exam:', err);
      showToast('error', 'Start exam failed', 'Failed to start exam. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const formatExamType = (type) => {
    if (!type) return 'General';
    return String(type)
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const formatSchedule = (value) => {
    if (!value) return 'Not scheduled';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not scheduled';

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const resolveAnswerText = (question, answer) => {
    if (!question) return answer?.answer || 'No answer provided';

    if (question.type === 'multiple-choice') {
      const selectedOption = question.options?.find(
        (option) => String(option.id) === String(answer?.answer)
      );
      return selectedOption?.text || answer?.answer || 'No answer provided';
    }

    return answer?.answer || 'No answer provided';
  };

  const getStatusBadge = (session) => {
    if (session.status === 'completed') {
      if (session.score !== null && session.score !== undefined) {
        const percentage = (session.score / session.totalPoints) * 100;
        const passed = percentage >= (session.exam?.passingScore || 60);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            passed
              ? 'bg-green-500/20 text-green-600 dark:text-green-400'
              : 'bg-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {passed ? '✓ PASSED' : '✗ FAILED'}
          </span>
        );
      }
      return (
        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-600 dark:text-yellow-400">
          Awaiting Grade
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-600 dark:text-blue-400">
        In Progress
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  const inProgressSessions = sessions.filter(
    (session) => session.status === 'in_progress' || (session.status === 'completed' && (session.score === null || session.score === undefined))
  );
  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900">

      {/* ── Inline Header ── */}
      <header className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-700 px-6 py-4 sticky top-0 z-40">
        <div className="flex items-center justify-between gap-4">

          {/* Left */}
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Student Dashboard
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Welcome back, {user?.name}
            </p>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">

            {/* Face status pill */}
            <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              faceStatus?.faceRegistered
                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
            }`}>
              {faceStatus?.faceRegistered ? '✓ Face Registered' : '⚠ Register Face'}
            </div>

            {/* ✅ ADDED: Re-register Face Button */}
            <button
              onClick={() => navigate("/face-register")}
              className="px-3 py-2 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 transition-colors flex items-center gap-2 text-sm font-semibold"
              title="Re-register your face"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="hidden sm:inline">Re-register Face</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {isDark
                ? <Sun className="w-5 h-5 text-yellow-400" />
                : <Moon className="w-5 h-5 text-slate-600" />
              }
            </button>

            {/* Avatar + dropdown menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 rounded-[20px] hover:shadow-sm transition-all"
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white force-white">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:block text-sm font-semibold text-slate-900 dark:text-white">
                  {user?.name}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-600 dark:text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isMenuOpen && (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] z-50 w-[200px] rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0px_10px_24px_rgba(15,23,42,0.15)]"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10 rounded-[10px] m-1 transition-colors"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page Content ── */}
      <div className="p-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <BookOpen className="w-8 h-8 text-blue-500 dark:text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{exams.length}</p>
            <p className="text-slate-600 dark:text-slate-400">Available Exams</p>
          </div>
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <Clock className="w-8 h-8 text-yellow-500 dark:text-yellow-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{inProgressSessions.length}</p>
            <p className="text-slate-600 dark:text-slate-400">In Progress</p>
          </div>
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <Award className="w-8 h-8 text-green-500 dark:text-green-400 mb-2" />
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{completedSessions.length}</p>
            <p className="text-slate-600 dark:text-slate-400">Completed Exams</p>
          </div>
        </div>

        {/* Available Exams */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Available Exams
          </h2>

          {exams.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">No exams available at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => {
                const existingSession = sessions.find(s => s.exam?._id === exam._id && s.status === 'in_progress');
                const completedSession = sessions.find(s => s.exam?._id === exam._id && s.status === 'completed');

                return (
                  <div
                    key={exam._id}
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                  >
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {exam.title}
                    </h3>
                    <div className="mb-3 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-700/60 dark:text-slate-300">
                      {formatExamType(exam.type)}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Schedule: {formatSchedule(exam.scheduledAt)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
                      {exam.description || 'No description'}
                    </p>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Duration: {exam.duration} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <Award className="w-4 h-4" />
                        <span>Passing Score: {exam.passingScore}%</span>
                      </div>
                    </div>

                    {completedSession && completedSession.score !== null ? (
                      <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                        <p className="text-green-600 dark:text-green-400 text-sm text-center">
                          ✓ Score: {completedSession.score}/{completedSession.totalPoints}
                          ({((completedSession.score / completedSession.totalPoints) * 100).toFixed(1)}%)
                        </p>
                      </div>
                    ) : completedSession ? (
                      <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <p className="text-yellow-600 dark:text-yellow-400 text-sm text-center">
                          ⏳ Submitted - Awaiting Grade
                        </p>
                      </div>
                    ) : existingSession ? (
                      <button
                        onClick={() => navigate(`/student/exam/${existingSession._id}`)}
                        className="w-full py-2 rounded-lg bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30 transition-colors font-semibold"
                      >
                        Resume Exam
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStartExam(exam._id)}
                        disabled={!faceStatus?.faceRegistered}
                        className={`w-full py-2 rounded-lg transition-colors font-semibold ${
                          faceStatus?.faceRegistered
                            ? 'bg-gradient-to-r from-electric to-blue-600 text-white hover:opacity-90'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {faceStatus?.faceRegistered ? 'Start Exam' : 'Register Face First'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Results */}
        {completedSessions.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-500 dark:text-green-400" />
              Your Results & Grades
            </h2>

            <div className="space-y-4">
              {completedSessions.map((session) => {
                const percentage = session.score && session.totalPoints
                  ? (session.score / session.totalPoints) * 100
                  : null;
                const passed = percentage !== null && percentage >= (session.exam?.passingScore || 60);
                const isGraded = session.score !== null && session.score !== undefined;

                return (
                  <div
                    key={session._id}
                    className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                            {session.exam?.title || 'Exam'}
                          </h3>
                          {getStatusBadge(session)}
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Completed: {new Date(session.completedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const newId = expandedSession === session._id ? null : session._id;
                          setExpandedSession(newId);
                          if (newId && !expandedDetails[newId]) {
                            try {
                              const res = await sessionAPI.getById(newId);
                              setExpandedDetails(prev => ({ ...prev, [newId]: res.data.session }));
                            } catch (err) {
                              console.error('Failed to fetch session details:', err);
                            }
                          }
                        }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                        aria-label={expandedSession === session._id ? 'Collapse result details' : 'Expand result details'}
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${expandedSession === session._id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {isGraded ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3 text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Your Score</p>
                          <p className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                            {session.score}/{session.totalPoints}
                          </p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3 text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Percentage</p>
                          <p className={`text-2xl font-bold ${getGradeColor(percentage)}`}>
                            {percentage?.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700/30 rounded-lg p-3 text-center">
                          <p className="text-sm text-slate-500 dark:text-slate-400">Result</p>
                          <p className={`text-2xl font-bold ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {passed ? 'PASSED' : 'FAILED'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-center mb-4">
                        <p className="text-yellow-600 dark:text-yellow-400">
                          ⏳ Exam submitted - Awaiting grading from instructor
                        </p>
                      </div>
                    )}

                    {expandedSession === session._id && (expandedDetails[session._id] || session).answers && (expandedDetails[session._id] || session).answers.length > 0 && (
                      <div className="mt-4 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                        <h4 className="font-semibold text-slate-900 dark:text-white">Detailed Answers</h4>
                        {(expandedDetails[session._id] || session).answers.map((answer, idx) => {
                          const detailed = expandedDetails[session._id] || session;
                          const questionId = answer?.questionId || answer?.questionId?._id || answer?.questionId;
                          const question = detailed.exam?.questions?.find(q => String(q._id || q.id) === String(questionId));
                          const answerText = resolveAnswerText(question, answer);
                          return (
                            <div
                              key={idx}
                              className="bg-slate-50 dark:bg-slate-700/20 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">Question {idx + 1}</p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                    {question?.type?.replace('-', ' ') || 'Question'}
                                  </p>
                                </div>
                                {answer.score !== undefined && answer.score !== null && (
                                  <span className={`text-sm font-semibold ${
                                    answer.score === question?.points
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-yellow-600 dark:text-yellow-400'
                                  }`}>
                                    Score: {answer.score}/{question?.points ?? detailed.totalPoints ?? (detailed.exam?.questions?.reduce((s, q) => s + (q.points || 0), 0) || 0)}
                                  </span>
                                )}
                              </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 whitespace-pre-wrap">
                                  {question?.text || 'Question'}
                                </p>
                              <div className="bg-white dark:bg-slate-800 rounded p-2 mb-2 border border-slate-200 dark:border-slate-700">
                                <p className="text-xs text-slate-500 dark:text-slate-400">Your Answer:</p>
                                {question?.type === 'coding' || question?.type === 'writing' ? (
                                  <pre className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap font-sans">
                                    {answerText}
                                  </pre>
                                ) : (
                                  <p className="text-sm text-slate-900 dark:text-white whitespace-pre-wrap">
                                    {answerText}
                                  </p>
                                )}
                              </div>
                              {answer.feedback && (
                                <div className="bg-blue-50 dark:bg-blue-500/10 rounded p-2 border border-blue-200 dark:border-blue-500/20">
                                  <p className="text-xs text-blue-600 dark:text-blue-400">Feedback:</p>
                                  <p className="text-sm text-slate-700 dark:text-slate-300">{answer.feedback}</p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}