import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { examAPI } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import {
  BookOpen,
  LayoutDashboard,
  CalendarDays,
  Clock3,
  Eye,
  FileText,
  Filter,
  ListFilter,
  Menu,
  Pencil,
  Plus,
  Trash2,
  Users,
  X
} from 'lucide-react';
import { CreateExamModel } from '../../components/UI/CreateExamModel.jsx';
import { showToast } from '../../hooks/useToast';

function MetricRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function formatType(type) {
  if (!type) return 'General';
  return type
    .split('-')
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function getExamLifecycleStatus(exam) {
  const status = (exam.status || '').toLowerCase();
  const scheduledAt = exam.scheduledAt ? new Date(exam.scheduledAt) : null;
  const isScheduledInFuture =
    scheduledAt instanceof Date && !Number.isNaN(scheduledAt.getTime()) && scheduledAt > new Date();

  if (status === 'completed') return 'Completed';
  if (status === 'flagged') return 'Flagged';
  if (isScheduledInFuture || status === 'scheduled') return 'Scheduled';
  if (status === 'in_progress' || status === 'active') return 'Active';
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Draft';
}

function formatScheduledLabel(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    .format(date)
    .toLowerCase();
}

function formatFullDateTime(value) {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function toEditExamPayload(exam) {
  return {
    id: exam._id,
    title: exam.title,
    description: exam.description,
    type: exam.type,
    duration: exam.duration,
    passingScore: exam.passingScore,
    questionItems: exam.questions || [],
    scheduledDateTime: exam.scheduledAt,
    generalInstructions: exam.generalInstructions,
    proctoringRules: exam.proctoringRules
  };
}

export default function ExamList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cardMenuExamId, setCardMenuExamId] = useState(null);
  const [modalInitialStep, setModalInitialStep] = useState(1);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewExam, setViewExam] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);

  const normalizedExams = useMemo(() => {
    return exams.map((exam) => ({
      ...exam,
      displayType: formatType(exam.type),
      lifecycleStatus: getExamLifecycleStatus(exam),
      questionsCount: exam.questions?.length || 0,
      participantsCount: exam.participants?.length || 0,
      durationLabel: `${exam.duration || 0} min`,
      scheduledLabel: formatScheduledLabel(exam.scheduledAt)
    }));
  }, [exams]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data } = await examAPI.list();
      setExams(data.exams || []);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (examData) => {
    try {
      const backendExam = {
        title: examData.title,
        description: examData.description,
        type: examData.type,
        duration: examData.duration,
        passingScore: examData.passingScore,
        status: examData.status || 'active',
        scheduledAt: examData.scheduledAt,
        generalInstructions: examData.generalInstructions,
        proctoringRules: examData.proctoringRules,
        questions: examData.questions
      };
      await examAPI.create(backendExam);
      await fetchExams();
      setIsCreateModalOpen(false);
      setSelectedExam(null);
      showToast('success', 'Exam created successfully!', 'The exam has been created.');
    } catch (err) {
      console.error('Failed to create exam:', err);
      showToast('error', 'Error creating exam', err.response?.data?.message || 'Failed to create exam');
    }
  };

  const handleUpdateExam = async (examId, examData) => {
    try {
      const backendExam = {
        title: examData.title,
        description: examData.description,
        type: examData.type,
        duration: examData.duration,
        passingScore: examData.passingScore,
        status: examData.status || 'active',
        scheduledAt: examData.scheduledAt,
        generalInstructions: examData.generalInstructions,
        proctoringRules: examData.proctoringRules,
        questions: examData.questions
      };
      await examAPI.update(examId, backendExam);
      await fetchExams();
      setIsCreateModalOpen(false);
      setSelectedExam(null);
      showToast('success', 'Exam updated', 'The exam has been updated successfully.');
    } catch (err) {
      console.error('Failed to update exam:', err);
      showToast('error', 'Error updating exam', err.response?.data?.message || 'Failed to update exam');
    }
  };

  const openCreateExamModal = (initialStep = 1, exam = null) => {
    setModalInitialStep(initialStep);
    setSelectedExam(exam ? toEditExamPayload(exam) : null);
    setCardMenuExamId(null);
    setIsCreateModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsCreateModalOpen(false);
    setSelectedExam(null);
    setModalInitialStep(1);
  };

  const openViewModal = (exam) => {
    const totalPoints = (exam.questions || []).reduce(
      (sum, question) => sum + Number(question.points || 0),
      0
    );
    setViewExam({
      ...exam,
      questionItems: (exam.questions || []).map((question, index) => ({
        id: index + 1,
        text: question.text,
        points: question.points
      })),
      questions: exam.questions?.length || 0,
      participants: exam.participants?.length || 0,
      passingMarks: exam.passingScore != null ? `${exam.passingScore}` : 'N/A',
      totalPoints,
      scheduledAt: exam.scheduledAt,
      scheduledLabel: formatScheduledLabel(exam.scheduledAt)
    });
    setIsViewModalOpen(true);
    setCardMenuExamId(null);
  };

  const handleDeleteExam = (id) => {
    setExamToDelete(id);
    setDeleteModalOpen(true);
    setCardMenuExamId(null);
  };

  const confirmDeleteExam = async () => {
    setDeleteModalOpen(false);
    try {
      await examAPI.delete(examToDelete);
      await fetchExams();
      setExamToDelete(null);
      showToast('success', 'Exam deleted', 'The exam has been deleted successfully.');
    } catch (err) {
      console.error('Failed to delete exam:', err);
      setExamToDelete(null);
      showToast('error', 'Error deleting exam', err.response?.data?.message || err.message || 'Unable to delete exam');
    }
  };

  const cancelDeleteExam = () => {
    setDeleteModalOpen(false);
    setExamToDelete(null);
  };

  if (loading) return (
    <div className="p-8 text-center text-slate-600 dark:text-slate-400">
      Loading exams...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900">

      

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-700 transition-transform duration-300 z-50 ${!sidebarOpen && '-translate-x-full'}`}>
        <div className="px-6 py-8 border-b border-slate-200 dark:border-slate-700">
          <h1 className="text-xl font-syne font-bold text-slate-900 dark:text-white">
            Examora Admin
          </h1>
        </div>

        <nav className="p-6 space-y-3">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg border border-electric/50 bg-electric/20 px-4 py-3 text-left font-semibold text-electric">
            <BookOpen className="h-5 w-5" />
            Manage Exams
          </button>
        </nav>

        <div className="absolute bottom-4 left-6 right-6">
          <div className="mx-auto inline-block w-fit max-w-full rounded-[10px] bg-slate-100 px-4 py-3 text-center text-sm dark:bg-slate-800">
            <p className="whitespace-nowrap leading-snug text-slate-900 dark:text-white font-semibold">
              {user?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>

        {/* Top bar */}
        <div className="bg-white dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-700 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {sidebarOpen
                ? <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                : <Menu className="w-6 h-6 text-slate-600 dark:text-slate-400" />
              }
            </button>

            <h2 className="text-xl font-syne font-bold text-slate-900 dark:text-white">
              Manage Exams
            </h2>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-electric to-blue-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Exam
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="p-6">
          {normalizedExams.length === 0 ? (
            <div className="text-center text-slate-500 dark:text-slate-400 py-12 bg-white dark:bg-slate-800/50 rounded-xl">
              No exams yet. Click "Create Exam" to get started!
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {normalizedExams.map((exam) => (
                <div
                  key={exam._id}
                  className="max-w-[420px] overflow-hidden rounded-[18px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm dark:shadow-[0px_1px_2px_rgba(15,23,42,0.45)]"
                >
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-3 p-3.5 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-semibold text-[#2f5bff]">
                        {exam.displayType}
                      </span>
                      <span className="rounded-full bg-[#e0f2fe] px-3 py-1 text-xs font-semibold text-[#2563eb]">
                        {exam.lifecycleStatus}
                      </span>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setCardMenuExamId((prev) => (prev === exam._id ? null : exam._id))}
                        className="rounded-full p-1 text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        <ListFilter className="h-5 w-5" />
                      </button>

                      {cardMenuExamId === exam._id && (
                        <div className="absolute right-0 top-9 z-20 w-[150px] rounded-[10px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-lg">
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(exam._id)}
                            className="inline-flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={2.2} />
                            Delete Exam
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="px-3 pb-3.5">
                    <h2 className="text-[18px] font-extrabold text-slate-900 dark:text-white">
                      {exam.title}
                    </h2>
                    <p className="mt-1.5 text-[15px] leading-5 text-slate-600 dark:text-slate-400">
                      {exam.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-3.5">
                    <MetricRow icon={Clock3} label="Duration" value={exam.durationLabel} />
                    <MetricRow icon={FileText} label="Questions" value={exam.questionsCount} />
                    <MetricRow icon={Users} label="Participants" value={exam.participantsCount} />
                    <MetricRow icon={Filter} label="Scheduled" value={exam.scheduledLabel} />
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-2 gap-2.5 border-t border-slate-200 dark:border-slate-700 p-3.5">
                    <button
                      type="button"
                      onClick={() => openViewModal(exam)}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-slate-100 dark:bg-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-600"
                    >
                      <Eye className="h-4 w-4" strokeWidth={2.2} />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateExamModal(2, exam)}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-electric to-blue-600 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2.2} />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CreateExamModel
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
        initialStep={modalInitialStep}
        onCreate={handleCreateExam}
        editExam={selectedExam}
        onUpdate={handleUpdateExam}
      />

      {/* View Modal */}
      {isViewModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]"
          onClick={() => setIsViewModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-[860px] overflow-hidden rounded-[10px] bg-white dark:bg-[#0f172a] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Exam preview"
          >
            {/* Modal header */}
            <div className="bg-[linear-gradient(120deg,#4f46e5_0%,#7c3aed_55%,#a21caf_100%)] px-6 py-5 sm:px-7 sm:py-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#2563eb]">
                    {viewExam?.type}
                  </span>
                  <span className="rounded-full bg-white/30 px-3 py-1 text-xs font-bold text-white">
                    {getExamLifecycleStatus(viewExam || {})}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                  className="rounded-full p-1 text-white/90 transition-colors hover:bg-white/15"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                {viewExam?.title}
              </h2>
              <p className="mt-2 max-w-[760px] text-lg leading-8 text-white/80">
                {viewExam?.description}
              </p>
            </div>

            {/* Modal body */}
            <div className="max-h-[62vh] overflow-y-auto px-6 py-6 sm:px-7 bg-[#f8fafc] dark:bg-[#0f172a]">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { icon: Clock3, label: 'Duration', value: viewExam?.duration },
                  { icon: FileText, label: 'Questions', value: viewExam?.questions },
                  { icon: Users, label: 'Passing Marks', value: viewExam?.passingMarks },
                  { icon: CalendarDays, label: 'Total Marks', value: viewExam?.totalPoints, accent: true },
                ].map(({ icon: Icon, label, value, accent }) => (
                  <div key={label} className="rounded-[10px] bg-white dark:bg-slate-800 p-4 shadow-sm border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                      <Icon className="h-4 w-4" />
                      {label}
                    </div>
                    <p className={`mt-2 text-xl font-semibold ${accent ? 'text-[#4f46e5]' : 'text-slate-900 dark:text-white'}`}>
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <h3 className="mt-7 text-[16px] font-extrabold text-slate-900 dark:text-white">
                Questions ({viewExam?.questions})
              </h3>

              <div className="mt-4 space-y-2">
                {(viewExam?.questionItems || []).map((question) => (
                  <div
                    key={question.id}
                    className="rounded-[10px] bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                          Q{question.id}.
                        </p>
                        <p className="mt-2 text-[16px] text-slate-600 dark:text-slate-300">
                          {question.text}
                        </p>
                      </div>
                      <span className="text-[18px] font-extrabold text-[#4f46e5]">
                        {question.points} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-[10px] border border-[#bfdbfe] bg-[#eff6ff] dark:bg-[#1e3a5f] dark:border-[#1d4ed8] px-6 py-5">
                <div className="flex items-center gap-3 text-[#1e40af] dark:text-[#60a5fa]">
                  <CalendarDays className="h-6 w-6" strokeWidth={2.2} />
                  <h4 className="text-[16px] font-extrabold leading-none">Scheduled For</h4>
                </div>
                <p className="mt-4 text-[14px] font-medium leading-none text-[#2563eb] dark:text-[#93c5fd]">
                  {formatFullDateTime(viewExam?.scheduledAt)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-[2px] px-4"
          onClick={cancelDeleteExam}
        >
          <div
            className="w-full max-w-[380px] rounded-[12px] border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Delete this exam?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">All questions and participant data will be lost.</p>
              </div>
              <button
                onClick={cancelDeleteExam}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 mt-4 pt-4 flex gap-2">
              <button
                onClick={cancelDeleteExam}
                className="flex-1 py-2 text-sm font-semibold rounded-[10px] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Keep it
              </button>
              <button
                onClick={confirmDeleteExam}
                className="flex-1 py-2 text-sm font-semibold rounded-[10px] bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}