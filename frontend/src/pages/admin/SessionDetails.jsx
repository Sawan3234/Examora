import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionAPI, proctoringAPI } from '../../api/services';
import { ArrowLeft, AlertTriangle, Clock, User, FileText, Eye, CheckCircle, XCircle, Save, Plus } from 'lucide-react';
import { showToast } from '../../hooks/useToast';

export default function SessionDetails() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [violations, setViolations] = useState([]);
  const [gradingMode, setGradingMode] = useState(false);
  const [marks, setMarks] = useState({});
  const [feedback, setFeedback] = useState({});
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  const getAnswerKey = (answer, fallback = '') =>
    String(answer?.questionId?._id || answer?.questionId || fallback);

  const fetchSessionDetails = async () => {
    try {
      const [sessionRes, violationsRes] = await Promise.all([
        sessionAPI.getById(sessionId),
        proctoringAPI.getViolations(sessionId)
      ]);

      const sessionData = sessionRes.data.session;
      setSession(sessionData);
      setViolations(violationsRes.data.violations || []);

      if (sessionData.exam?.questions) {
        const max = sessionData.exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);
        setMaxScore(max);
      }

      if (sessionData.score !== null && sessionData.answers) {
        const savedMarks = {};
        const savedFeedback = {};
        sessionData.answers.forEach((answer, index) => {
          const answerKey = getAnswerKey(answer, index);
          if (answer.score !== undefined) {
            savedMarks[answerKey] = String(answer.score);
          }
          if (answer.feedback) {
            savedFeedback[answerKey] = answer.feedback;
          }
        });
        setMarks(savedMarks);
        setFeedback(savedFeedback);
        setTotalScore(sessionData.score || 0);
      }
    } catch (err) {
      console.error('Failed to fetch session details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkChange = (answerKey, value) => {
    if (value === '') {
      const newMarks = { ...marks, [answerKey]: '' };
      setMarks(newMarks);
      const newTotal = Object.values(newMarks).reduce((sum, mark) => sum + (parseFloat(mark) || 0), 0);
      setTotalScore(newTotal);
      return;
    }

    const numericValue = parseInt(value, 10);
    if (Number.isNaN(numericValue)) return;

    const newMarks = { ...marks, [answerKey]: String(numericValue) };
    setMarks(newMarks);
    const newTotal = Object.values(newMarks).reduce((sum, mark) => sum + (parseFloat(mark) || 0), 0);
    setTotalScore(newTotal);
  };

  const handleFeedbackChange = (answerKey, value) => {
    setFeedback({ ...feedback, [answerKey]: value });
  };

  const handleSaveGrades = async () => {
    try {
      const percentage = (totalScore / maxScore) * 100;
      const passed = percentage >= (session.exam?.passingScore || 60);

      // Map marks to answers by matching questionId to exam questions index
      const updatedAnswers = session.answers.map((answer, idx) => {
        const answerKey = getAnswerKey(answer, idx);
        const scoreVal = parseFloat(marks[answerKey]);
        return {
          ...answer,
          score: Number.isNaN(scoreVal) ? 0 : scoreVal,
          feedback: feedback[answerKey] || ''
        };
      });

      const gradeData = {
        answers: updatedAnswers,
        score: totalScore,
        totalPoints: maxScore,
        percentage,
        passed
      };

      const response = await sessionAPI.updateGrades(sessionId, gradeData);

      if (response.data.success) {
        setSession(response.data.session);
        setGradingMode(false);
        showToast(
          'success',
          'Grades saved!',
          'The grades have been saved!!'
        );
        await fetchSessionDetails();
      } else {
        throw new Error('Failed to save grades');
      }
    } catch (err) {
      console.error('Failed to save grades:', err);
      showToast(
        'error',
        'Error saving grades',
        err.response?.data?.message || err.message || 'Unable to save grades to database'
      );
    }
  };

  const startGrading = () => {
    if (!session) return setGradingMode(true);
    const preMarks = {};
    const preFeedback = {};
    // iterate questions and answers to prefill marks for MCQ
    (session.exam?.questions || []).forEach((question, idx) => {
      const answer = (session.answers || []).find(
        (a) => String(a.questionId?._id || a.questionId) === String(question._id || question.id)
      );
      const answerKey = String(question._id || question.id || idx);
      // if already has score, preserve it
      if (answer && answer.score !== undefined && answer.score !== null) {
        preMarks[answerKey] = String(answer.score);
        if (answer.feedback) preFeedback[answerKey] = answer.feedback;
        return;
      }

      if (question?.type === 'multiple-choice') {
        // if student's selected option matches correctOption, award full points
        const studentAnswer = answer?.answer;
        if (String(studentAnswer) === String(question.correctOption)) {
          preMarks[answerKey] = String(question.points || 0);
        } else {
          // leave blank so grader can assign partial marks
          preMarks[answerKey] = '';
        }
      } else {
        // non-mcq: preserve existing score or leave blank
        preMarks[answerKey] = answer && (answer.score !== undefined && answer.score !== null) ? String(answer.score) : '';
      }

      if (answer?.feedback) preFeedback[answerKey] = answer.feedback;
    });

    setMarks(preMarks);
    setFeedback(preFeedback);
    // compute total of prefilled marks and set totalScore so gradeData isn't zero
    const preTotal = Object.values(preMarks).reduce((sum, m) => sum + (parseFloat(m) || 0), 0);
    setTotalScore(preTotal);
    setGradingMode(true);
  };

  const getViolationSeverityColor = (severity) => {
    switch (severity) {
      case 'high':   return 'text-red-600 dark:text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/20';
      case 'low':    return 'text-blue-600 dark:text-blue-400 bg-blue-500/20';
      default:       return 'text-slate-600 dark:text-slate-400 bg-slate-500/20';
    }
  };

  const getQuestionTypeIcon = (type) => {
    switch (type) {
      case 'multiple-choice': return <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400" />;
      case 'coding':          return <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />;
      default:                return <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />;
    }
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

  const getViolationMessage = (violation) => {
    if (violation?.metadata?.message) return violation.metadata.message;

    switch (violation?.type) {
      case 'face_not_detected':
        return 'No face detected in frame';
      case 'multiple_faces':
        return 'Multiple faces detected';
      case 'face_mismatch':
        return 'Face mismatch detected';
      case 'gaze_deviation':
        return 'Gaze deviation detected';
      case 'head_pose_violation':
        return 'Head pose violation detected';
      case 'fullscreen_exit':
        return 'Exited fullscreen mode';
      case 'window_focus_lost':
        return 'Window lost focus';
      case 'tab_switch':
        return 'Student switched tabs';
      case 'gadget_detected':
        return 'Suspicious device detected';
      default:
        return 'Violation recorded';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400 text-xl">Loading session details...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400 text-xl">Session not found</div>
      </div>
    );
  }

  const percentage = session.score && maxScore ? (session.score / maxScore) * 100 : 0;
  const passed = percentage >= (session.exam?.passingScore || 60);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gradient-to-br dark:from-slate-950 dark:to-slate-900">
      <div className="p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className="p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Session Details
            </h1>
          </div>

          {!gradingMode && session.status === 'completed' && (
            <button
              onClick={startGrading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-electric to-blue-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" /> Grade Exam
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Total Score</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {session.score !== null ? `${session.score}/${maxScore}` : 'Not graded'}
                </p>
              </div>
              {session.score !== null && (
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  passed
                    ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                    : 'bg-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  {passed ? 'PASSED' : 'FAILED'}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Percentage</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {session.score !== null ? `${percentage.toFixed(1)}%` : 'N/A'}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Passing Score</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {session.exam?.passingScore || 60}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Violations</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{violations.length}</p>
          </div>
        </div>

        {/* Student & Exam Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              Student Information
            </h2>
            <div className="space-y-2">
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Name:</span> {session.student?.name || 'N/A'}
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Email:</span> {session.student?.email || 'N/A'}
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Face Registered:</span> {session.student?.faceRegisteredAt ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-500 dark:text-green-400" />
              Exam Information
            </h2>
            <div className="space-y-2">
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Exam:</span> {session.exam?.title || 'N/A'}
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Type:</span> {session.exam?.type || 'N/A'}
              </p>
              <p className="text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span className="font-semibold text-slate-900 dark:text-white">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                  session.status === 'completed'   ? 'bg-green-500/20 text-green-600 dark:text-green-400' :
                  session.status === 'in_progress' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                  session.status === 'flagged'     ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                  'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                }`}>
                  {session.status}
                </span>
              </p>
              <p className="text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Started:</span> {new Date(session.startedAt).toLocaleString()}
              </p>
              {session.completedAt && (
                <p className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-white">Completed:</span> {new Date(session.completedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Questions & Answers */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-purple-500 dark:text-purple-400" />
            Questions & Answers
          </h2>

          {session.answers && session.answers.length > 0 ? (
            <div className="space-y-6">
              {session.answers.map((answer, index) => {
                const questionId = answer?.questionId || answer?.questionId?._id || answer?.questionId;
                const question = session.exam?.questions?.find(q => String(q._id || q.id) === String(questionId));
                const answerKey = String(question?._id || question?.id || questionId || index);
                const isMultipleChoice = question?.type === 'multiple-choice';
                const studentAnswerValue = answer?.answer;
                const studentAnswerText = resolveAnswerText(question, answer);
                const correctAnswer = isMultipleChoice
                  ? question.options?.find(opt => String(opt.id) === String(question.correctOption))?.text
                  : null;
                const isCorrect = isMultipleChoice && String(studentAnswerValue) === String(question.correctOption);

                return (
                  <div key={index} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 shrink-0">
                          {getQuestionTypeIcon(question?.type)}
                        </div>
                        <div className="flex items-start gap-2 flex-wrap">
                          <div>
                            <h3 className="text-lg font-semibold leading-none text-slate-900 dark:text-white">
                              Question {index + 1}
                            </h3>
                            <p className="mt-1 text-xs leading-none text-slate-500 dark:text-slate-400 capitalize">
                              {question?.type?.replace('-', ' ') || 'Question'}
                            </p>
                          </div>
                          {question?.points && (
                            <span className="text-sm leading-none text-slate-500 dark:text-slate-400">
                              ({question.points} points)
                            </span>
                          )}
                        </div>
                      </div>
                      {isMultipleChoice && !gradingMode && (
                        <div className="flex items-center gap-2">
                          {isCorrect
                            ? <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />
                            : <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                          }
                          <span className="text-sm text-slate-600 dark:text-slate-300">
                            {isCorrect ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>
                      )}
                    </div>

                    <p className="text-slate-800 dark:text-white mb-3 whitespace-pre-wrap">{question?.text || 'Question text not available'}</p>

                    {/* Student Answer */}
                    <div className="mb-3">
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1">Student's Answer:</p>
                      <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                        {question?.type === 'coding' || question?.type === 'writing' ? (
                          <pre className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">{studentAnswerText}</pre>
                        ) : (
                          <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">{studentAnswerText}</p>
                        )}
                      </div>
                    </div>

                    {/* Correct Answer for Multiple Choice */}
                    {isMultipleChoice && correctAnswer && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-1">Correct Answer:</p>
                        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                          <p className="text-green-700 dark:text-green-300">{correctAnswer}</p>
                        </div>
                      </div>
                    )}

                    {/* Grading inputs */}
                    {gradingMode && (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-center gap-4">
                          <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                            Marks Awarded:
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="0"
                            max={question?.points ? Math.ceil(question.points) : 10}
                            value={marks[answerKey] ?? answer.score ?? ''}
                            onChange={(e) => handleMarkChange(answerKey, e.target.value)}
                            className="w-24 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                          />
                          <span className="text-slate-500 dark:text-slate-400">/ {Math.ceil(question?.points || 10)}</span>
                        </div>

                        <div>
                          <label className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-1 block">
                            Feedback (Optional):
                          </label>
                          <textarea
                            value={feedback[answerKey] ?? answer.feedback ?? ''}
                            onChange={(e) => handleFeedbackChange(answerKey, e.target.value)}
                            rows="2"
                            placeholder="Add feedback for the student..."
                            className="w-full px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-electric"
                          />
                        </div>
                      </div>
                    )}

                    {/* Existing feedback */}
                    {!gradingMode && answer.feedback && (
                      <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 border border-blue-200 dark:border-blue-500/30">
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Feedback:</p>
                        <p className="text-slate-700 dark:text-slate-300 text-sm">{answer.feedback}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              No answers submitted for this session
            </p>
          )}
        </div>

        {/* Violations */}
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />
            Proctoring Violations ({violations.length})
          </h2>

          {violations.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-center py-8">
              No violations recorded for this session
            </p>
          ) : (
            <div className="space-y-3">
              {violations.map((violation, index) => (
                <div
                  key={index}
                  className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4 border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getViolationSeverityColor(violation.severity)}`}>
                        {violation.severity.toUpperCase()}
                      </span>
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {violation.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {new Date(violation.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {getViolationMessage(violation)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grading Actions */}
        {gradingMode && (
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setGradingMode(false)}
              className="px-6 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-semibold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveGrades}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-electric to-blue-600 text-white font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4" /> Save Grades
            </button>
          </div>
        )}

        {/* Final result summary */}
        {!gradingMode && session.score !== null && (
          <div className={`mt-6 p-4 rounded-xl ${
            passed
              ? 'bg-green-500/20 border border-green-500/30'
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-slate-900 dark:text-white font-semibold">Final Result</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {session.score}/{maxScore} ({percentage.toFixed(1)}%)
                </p>
              </div>
              <div className={`text-xl font-bold ${passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {passed ? 'PASSED' : 'FAILED'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}