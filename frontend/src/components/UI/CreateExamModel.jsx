import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckSquare,
  Clock3,
  Code2,
  FileText,
  Plus,
  PenLine,
  Save,
  Trash2,
  X,
} from "lucide-react";

const STEPS = [1, 2, 3, 4];
const DEFAULT_PROCTORING_RULES = [
  "Camera must be enabled throughout the exam",
  "No switching tabs or windows during the exam",
  "Face must be visible at all times",
  "No external materials or devices allowed",
];
const DEFAULT_OPTIONS = [
  { id: 1, text: "" },
  { id: 2, text: "" },
  { id: 3, text: "" },
  { id: 4, text: "" },
];

const createEmptyQuestion = (id) => ({
  id,
  text: "",
  points: 10,
  testCases: [],
  options: [],
  correctOption: null,
});

const EXAM_TYPES = [
  {
    key: "writing",
    title: "Writing",
    description: "Descriptive answers in text areas",
    Icon: PenLine,
  },
  {
    key: "multiple-choice",
    title: "Multiple Choice",
    description: "Questions with multiple options",
    Icon: CheckSquare,
  },
  {
    key: "coding",
    title: "Coding",
    description: "Programming challenges",
    Icon: Code2,
  },
];

export function CreateExamModel({
  isOpen,
  onClose,
  initialStep = 1,
  onCreate,
  editExam = null,
  onUpdate,
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [examType, setExamType] = useState("multiple-choice"); // Changed default to multiple-choice
  const [questions, setQuestions] = useState([createEmptyQuestion(1)]);
  const [examTitle, setExamTitle] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [passingScore, setPassingScore] = useState(60);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [generalInstructions, setGeneralInstructions] = useState("");
  const [proctoringRules, setProctoringRules] = useState(DEFAULT_PROCTORING_RULES);
  const [newRule, setNewRule] = useState("");
  const onCloseRef = useRef(onClose);
  const isEditMode = Boolean(editExam);

  // Auto-initialize options for all questions when exam type is multiple-choice
  useEffect(() => {
    if (examType === "multiple-choice") {
      setQuestions(prevQuestions => 
        prevQuestions.map(question => {
          if (!question.options || question.options.length === 0) {
            return {
              ...question,
              options: DEFAULT_OPTIONS.map(opt => ({ ...opt })),
              correctOption: 1
            };
          }
          return question;
        })
      );
    }
  }, [examType]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCloseRef.current();
    }, 400);
  };

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const progressWidth = `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`;
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points || 0), 0);
  const selectedExamTypeConfig = EXAM_TYPES.find((type) => type.key === examType);
  const selectedExamType = selectedExamTypeConfig?.title || "Exam";
  const SelectedExamTypeIcon = selectedExamTypeConfig?.Icon || Code2;
  const isStep1Valid =
    examTitle.trim().length > 0 &&
    examDescription.trim().length > 0 &&
    examType.trim().length > 0 &&
    Number(durationMinutes) > 0;
  const isStep2Valid = questions.some((question) => question.text.trim().length > 0);

  const getExamTypeKey = (value) => {
    const matched = EXAM_TYPES.find((type) => type.key === value || type.title === value);
    return matched?.key || "writing";
  };

  const getDurationValue = (durationValue) => {
    const matched = String(durationValue || "").match(/\d+/);
    return matched ? Number(matched[0]) : 30;
  };

  const toInputDateTime = (value) => {
    if (!value) return { date: "", time: "" };

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    const hours = String(parsed.getHours()).padStart(2, "0");
    const minutes = String(parsed.getMinutes()).padStart(2, "0");

    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}`,
    };
  };

  const handleNext = () => {
    if (currentStep === 1 && !isStep1Valid) return;
    if (currentStep === 2 && !isStep2Valid) return;
    setCurrentStep((step) => Math.min(step + 1, STEPS.length));
  };

  const handlePrevious = () => {
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const handleAddQuestion = () => {
    setQuestions((prev) => {
      const nextId = Math.max(0, ...prev.map((question) => question.id)) + 1;
      const newQuestion = {
        id: nextId,
        text: "",
        points: 10,
        testCases: [],
        options: [],
        correctOption: null,
      };
      
      // Auto-initialize options for multiple choice
      if (examType === "multiple-choice") {
        newQuestion.options = DEFAULT_OPTIONS.map(opt => ({ ...opt }));
        newQuestion.correctOption = 1;
      }
      
      return [...prev, newQuestion];
    });
  };

  const handleDeleteQuestion = (id) => {
    setQuestions((prev) => {
      if (prev.length <= 1) return prev;
      return prev
        .filter((question) => question.id !== id)
        .map((question, index) => ({ ...question, id: index + 1 }));
    });
  };

  const handleQuestionTextChange = (id, value) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, text: value } : q))
    );
  };

  const handleQuestionPointsChange = (id, value) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, points: value } : q))
    );
  };

  const handleOptionTextChange = (questionId, optionId, value) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: (question.options || []).map((option) =>
                option.id === optionId ? { ...option, text: value } : option
              ),
            }
          : question
      )
    );
  };

  const handleCorrectOptionChange = (questionId, optionId) => {
    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId ? { ...question, correctOption: optionId } : question
      )
    );
  };

  const handleAddOption = (questionId) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const nextOptionId =
          Math.max(0, ...(question.options || []).map((option) => option.id)) + 1;

        return {
          ...question,
          options: [...(question.options || []), { id: nextOptionId, text: "" }],
        };
      })
    );
  };

  const handleDeleteOption = (questionId, optionId) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const currentOptions = question.options || [];
        if (currentOptions.length <= 2) return question;

        const remainingOptions = currentOptions
          .filter((option) => option.id !== optionId)
          .map((option, index) => ({ ...option, id: index + 1 }));

        const nextCorrectOption =
          question.correctOption === optionId
            ? 1
            : Math.min(question.correctOption || 1, remainingOptions.length);

        return {
          ...question,
          options: remainingOptions,
          correctOption: nextCorrectOption,
        };
      })
    );
  };

  const handleAddTestCase = (questionId) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const nextTestCaseId =
          Math.max(0, ...(question.testCases || []).map((testCase) => testCase.id || 0)) + 1;

        return {
          ...question,
          testCases: [
            ...(question.testCases || []),
            { id: nextTestCaseId, input: "", output: "" },
          ],
        };
      })
    );
  };

  const handleTestCaseChange = (questionId, testCaseId, field, value) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        return {
          ...question,
          testCases: (question.testCases || []).map((testCase) =>
            testCase.id === testCaseId ? { ...testCase, [field]: value } : testCase
          ),
        };
      })
    );
  };

  const handleDeleteTestCase = (questionId, testCaseId) => {
    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id !== questionId) return question;

        const remainingTestCases = (question.testCases || [])
          .filter((testCase) => testCase.id !== testCaseId)
          .map((testCase, index) => ({ ...testCase, id: index + 1 }));

        return {
          ...question,
          testCases: remainingTestCases,
        };
      })
    );
  };

  const handleRemoveProctoringRule = (indexToRemove) => {
    setProctoringRules((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAddProctoringRule = () => {
    const trimmedRule = newRule.trim();
    if (!trimmedRule) return;

    setProctoringRules((prev) => [...prev, trimmedRule]);
    setNewRule("");
  };

  const formatScheduledLabel = () => {
    if (!scheduledDate) return "TBD";

    const parsed = new Date(`${scheduledDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return "TBD";

    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const formatScheduledAt = () => {
    if (!scheduledDate) return "Not scheduled";

    const dateSource = scheduledTime ? `${scheduledDate}T${scheduledTime}` : `${scheduledDate}T00:00:00`;
    const parsed = new Date(dateSource);
    if (Number.isNaN(parsed.getTime())) return "Not scheduled";

    const datePart = parsed.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (!scheduledTime) return datePart;

    const timePart = parsed.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: false,
    });

    return `${datePart} at ${timePart}`;
  };

  const getScheduledDateTime = () => {
    if (!scheduledDate) return null;

    const dateSource = scheduledTime ? `${scheduledDate}T${scheduledTime}` : `${scheduledDate}T00:00:00`;
    const parsed = new Date(dateSource);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toISOString();
  };

  const handleSubmitExam = () => {
    // Prepare questions with ALL data including options
    const preparedQuestions = questions.map((question) => {
      const baseQuestion = {
        text: question.text.trim() || `Question ${question.id}`,
        points: Number(question.points) || 10,
      };

      // For multiple choice - include options and correct answer
      if (examType === "multiple-choice") {
        return {
          ...baseQuestion,
          type: "multiple-choice",
          options: (question.options || []).map(opt => ({
            id: opt.id,
            text: opt.text
          })),
          correctOption: question.correctOption
        };
      }
      
      // For coding questions - include test cases
      if (examType === "coding") {
        return {
          ...baseQuestion,
          type: "coding",
          testCases: (question.testCases || []).map(tc => ({
            id: tc.id,
            input: tc.input,
            output: tc.output
          }))
        };
      }
      
      // For writing questions
      return {
        ...baseQuestion,
        type: "writing"
      };
    });

    const payload = {
      title: examTitle.trim() || "Untitled Exam",
      description: examDescription.trim() || "No description provided.",
      type: examType,
      duration: Number(durationMinutes) || 60,
      passingScore: Number(passingScore) || 60,
      status: "active",
      questions: preparedQuestions,
      scheduledAt: getScheduledDateTime(),
      generalInstructions: generalInstructions,
      proctoringRules: proctoringRules,
    };

    console.log("🔍 Submitting exam payload:", JSON.stringify(payload, null, 2));

    if (isEditMode && typeof onUpdate === "function") {
      onUpdate(editExam.id, payload);
    } else if (typeof onCreate === "function") {
      onCreate(payload);
    }

    handleClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setIsClosing(false);
      return;
    }

    setCurrentStep(Math.min(Math.max(Number(initialStep) || 1, 1), STEPS.length));

    if (editExam) {
      const normalizedQuestions = (editExam.questionItems || []).length
        ? editExam.questionItems.map((question, index) => ({
            ...createEmptyQuestion(index + 1),
            id: index + 1,
            text: question.text || "",
            points: Number(question.points) || 10,
            options: question.options || [],
            correctOption: question.correctOption || null,
          }))
        : [createEmptyQuestion(1)];

      const { date, time } = toInputDateTime(editExam.scheduledDateTime);

      setQuestions(normalizedQuestions);
      setExamTitle(editExam.title || "");
      setExamDescription(editExam.description || "");
      setExamType(getExamTypeKey(editExam.examTypeKey || editExam.type));
      setDurationMinutes(getDurationValue(editExam.duration));
      setPassingScore(Number(editExam.passingScore) || 60);
      setScheduledDate(date);
      setScheduledTime(time);
      setGeneralInstructions(editExam.generalInstructions || "");
      setProctoringRules(
        Array.isArray(editExam.proctoringRules) && editExam.proctoringRules.length > 0
          ? editExam.proctoringRules
          : DEFAULT_PROCTORING_RULES
      );
    } else {
      // Initialize first question with options if multiple-choice
      const initialQuestion = createEmptyQuestion(1);
      if (examType === "multiple-choice") {
        initialQuestion.options = DEFAULT_OPTIONS.map(opt => ({ ...opt }));
        initialQuestion.correctOption = 1;
      }
      setQuestions([initialQuestion]);
      setExamTitle("");
      setExamDescription("");
      setExamType("multiple-choice");
      setDurationMinutes(30);
      setPassingScore(60);
      setScheduledDate("");
      setScheduledTime("");
      setGeneralInstructions("");
      setProctoringRules(DEFAULT_PROCTORING_RULES);
    }

    setNewRule("");

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, initialStep, editExam]);

  if (!isOpen && !isClosing) return null;

  const animationStyles = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes slideUpFromBottomRight {
      from {
        opacity: 0;
        transform: translate(120px, 120px) scale(0.85);
      }
      to {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
    }
    @keyframes slideDownToBottomRight {
      from {
        opacity: 1;
        transform: translate(0, 0) scale(1);
      }
      to {
        opacity: 0;
        transform: translate(120px, 120px) scale(0.85);
      }
    }
    .modal-backdrop {
      animation: fadeIn 0.3s ease-out;
    }
    .modal-backdrop.closing {
      animation: fadeOut 0.3s ease-in forwards;
    }
    .modal-content {
      animation: slideUpFromBottomRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .modal-content.closing {
      animation: slideDownToBottomRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  `;

  return (
    <>
      <style>{animationStyles}</style>
      <div
        className={`modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px] rounded-lg${isClosing ? " closing" : ""}`}
        onClick={handleClose}
        role="presentation"
      >
        <div
          className={`modal-content create-exam-modal w-full max-w-[920px] overflow-hidden rounded-3xl bg-white shadow-2xl${isClosing ? " closing" : ""}`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={isEditMode ? "Edit Exam" : "Create New Exam"}
        >
          <div className="flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="modal-header-title text-xl font-bold text-white">{isEditMode ? "Edit Exam" : "Create New Exam"}</h3>
                <p className="modal-header-step mt-0.5 text-sm text-indigo-100">Step {currentStep} of 4</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Close modal"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="bg-[#f3f4f6] px-6 pb-2">
            <div className="relative h-6">
              <div className="absolute top-3 h-1 w-full rounded bg-gray-300" />
              <div className="absolute top-3 h-1 rounded bg-indigo-600" style={{ width: progressWidth }} />
              <div className="absolute top-0 left-0 right-0 grid grid-cols-4">
                {STEPS.map((step) => {
                  const active = step <= currentStep;
                  return (
                    <div key={step} className="flex justify-center">
                      <span
                        className={`modal-step-indicator flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-xs font-bold ${
                          active ? "bg-indigo-600 text-white" : "bg-gray-300 text-gray-600"
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {currentStep === 1 ? (
            <>
              <div className="max-h-[62vh] space-y-5 overflow-y-auto bg-white p-6">
                <h4 className="text-[20px] font-extrabold text-gray-900">Exam Basic Details</h4>
                <div>
                  <label className="mb-2 block text-[14px] font-extrabold text-gray-700">Exam Title *</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(event) => setExamTitle(event.target.value)}
                    placeholder="e.g., Computer Science Final Exam"
                    className="w-full rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[14px] font-extrabold text-gray-700">Description *</label>
                  <textarea
                    rows={4}
                    value={examDescription}
                    onChange={(event) => setExamDescription(event.target.value)}
                    placeholder="Describe the exam purpose, topics covered, etc."
                    className="w-full resize-none rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-3 block text-[14px] font-extrabold text-gray-700">Exam Type *</label>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {EXAM_TYPES.map(({ key, title, description, Icon }) => {
                      const selected = examType === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setExamType(key)}
                          className={`rounded-[10px] border-2 p-4 text-left transition-all ${
                            selected ? "border-indigo-600 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300"
                          }`}
                        >
                          <div className="mb-2 flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? "bg-indigo-600" : "bg-gray-100"}`}>
                              <Icon className={`h-5 w-5 ${selected ? "text-white" : "text-gray-600"}`} />
                            </div>
                            <p className={`flex-1 text-[16px] font-extrabold ${selected ? "text-indigo-900" : "text-gray-900"}`}>
                              {title}
                            </p>
                            {selected && (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600">
                                <span className="h-2 w-2 rounded-full bg-white" />
                              </span>
                            )}
                          </div>
                          <p className="text-[13px] text-gray-400">{description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                      <Clock3 className="mr-1 h-4 w-4" /> Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(Number(event.target.value) || 0)}
                      className="w-full rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Passing Marks </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={passingScore}
                      onChange={(event) => setPassingScore(Number(event.target.value) || 0)}
                      className="w-full rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 flex items-center text-sm font-semibold text-gray-700">
                      <Calendar className="mr-1 h-4 w-4" /> Scheduled Date
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(event) => setScheduledDate(event.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">Scheduled Time</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(event) => setScheduledTime(event.target.value)}
                      className="w-full rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep1Valid}
                  className="rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold !text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next Step
                </button>
              </div>
            </>
          ) : currentStep === 2 ? (
            <>
              <div className="max-h-[62vh] space-y-4 overflow-y-auto bg-white p-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[18px] font-bold text-gray-900">Exam Questions</h4>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold !text-white"
                  >
                      <Plus className="h-4 w-4 !text-white" /> Add Question
                  </button>
                </div>

                {examType === "multiple-choice" && questions.map((question) => (
                  <div key={question.id} className="rounded-[10px] border border-gray-200 bg-[#f5f6f8] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[16px] font-bold text-gray-700">Question {question.id}</p>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Enter your question here..."
                      value={question.text}
                      onChange={(event) => handleQuestionTextChange(question.id, event.target.value)}
                      className="w-full resize-none rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-[16px] font-semibold text-gray-700">Marks:</label>
                      <input
                        type="number"
                        min={1}
                        value={question.points}
                        onChange={(event) => handleQuestionPointsChange(question.id, event.target.value)}
                        className="w-[76px] rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-1.5 text-sm font-medium leading-none text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="mt-4">
                      <p className="mb-3 text-[16px] font-semibold text-gray-700">Options (Select the correct answer)</p>
                      <div className="space-y-2.5">
                        {(question.options || []).map((option) => (
                          <div key={option.id} className="flex items-center gap-3 rounded-[10px] border border-gray-300 bg-white px-3 py-2">
                            <input
                              type="radio"
                              name={`correct-option-${question.id}`}
                              checked={question.correctOption === option.id}
                              onChange={() => handleCorrectOptionChange(question.id, option.id)}
                              className="h-5 w-5 appearance-none rounded-full border-2 border-gray-400 bg-[#f3f4f6] checked:border-indigo-600 checked:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <input
                              type="text"
                              value={option.text}
                              onChange={(event) => handleOptionTextChange(question.id, option.id, event.target.value)}
                              placeholder={`Option ${option.id}`}
                              className="flex-1 rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-2 text-sm font-normal text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleDeleteOption(question.id, option.id)}
                              className="text-red-500 transition-colors hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                              disabled={(question.options || []).length <= 2}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddOption(question.id)}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold !text-white"
                      >
                        <Plus className="h-4 w-4 !text-white" /> Add Another Option
                      </button>
                    </div>
                  </div>
                ))}

                {examType === "writing" && questions.map((question) => (
                  <div key={question.id} className="rounded-[10px] border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[16px] font-bold text-gray-700">Question {question.id}</p>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Enter your question here..."
                      value={question.text}
                      onChange={(event) => handleQuestionTextChange(question.id, event.target.value)}
                      className="w-full resize-none rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-[16px] font-semibold text-gray-700">Marks:</label>
                      <input
                        type="number"
                        min={1}
                        value={question.points}
                        onChange={(event) => handleQuestionPointsChange(question.id, event.target.value)}
                        className="w-[76px] rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-1.5 text-sm font-medium leading-none text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                ))}

                {examType === "coding" && questions.map((question) => (
                  <div key={question.id} className="rounded-[10px] border border-gray-200 bg-[#f5f6f8] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[16px] font-bold text-gray-700">Question {question.id}</p>
                      {questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(question.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-red-200 bg-red-50 text-red-600 transition-colors hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Enter your question here..."
                      value={question.text}
                      onChange={(event) => handleQuestionTextChange(question.id, event.target.value)}
                      className="w-full resize-none rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-[16px] font-semibold text-gray-700">Marks:</label>
                      <input
                        type="number"
                        min={1}
                        value={question.points}
                        onChange={(event) => handleQuestionPointsChange(question.id, event.target.value)}
                        className="w-[76px] rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-1.5 text-sm font-medium leading-none text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="mt-4">
                      <p className="mb-3 text-[16px] font-semibold text-gray-700">Test Cases</p>
                      {(question.testCases || []).length > 0 && (
                        <div className="mb-3 space-y-3">
                          {(question.testCases || []).map((testCase) => (
                            <div key={testCase.id} className="flex items-center gap-3">
                              <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
                                <input
                                  type="text"
                                  value={testCase.input}
                                  onChange={(event) => handleTestCaseChange(question.id, testCase.id, "input", event.target.value)}
                                  placeholder={`Input ${testCase.id}`}
                                  className="h-10 w-full rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-8 text-[16px] text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                  type="text"
                                  value={testCase.output}
                                  onChange={(event) => handleTestCaseChange(question.id, testCase.id, "output", event.target.value)}
                                  placeholder={`Output ${testCase.id}`}
                                  className="h-10 w-full rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-8 text-[16px] text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTestCase(question.id, testCase.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-500"
                              >
                                <Trash2 className="h-6 w-6" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddTestCase(question.id)}
                        className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 px-10 py-2 text-[16px] font-semibold text-white"
                      >
                        <Plus className="h-3 w-3" /> Add Test Case
                      </button>
                    </div>
                  </div>
                ))}

                <div className="rounded-[10px] border border-indigo-200 bg-indigo-50/70 p-4">
                  <div className="flex items-center justify-between text-sm font-semibold text-indigo-900">
                    <span>Total Questions:</span>
                    <span className="text-xl">{questions.length}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm font-semibold text-indigo-900">
                    <span>Total Marks:</span>
                    <span className="text-xl">{totalPoints}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!isStep2Valid}
                  className="rounded-[10px] bg-gradient-to-r from-indigo-400 to-purple-400 px-6 py-2.5 text-sm font-semibold !text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next Step
                </button>
              </div>
            </>
          ) : currentStep === 3 ? (
            <>
              <div className="max-h-[62vh] space-y-1 overflow-y-auto bg-white p-6">
                <h4 className="text-[20px] font-extrabold text-gray-900">Exam Rules & Instructions</h4>
                <div>
                  <label className="mb-1 block text-[16px] font-bold text-gray-600">General Instructions</label>
                  <textarea
                    rows={4}
                    value={generalInstructions}
                    onChange={(event) => setGeneralInstructions(event.target.value)}
                    placeholder="Add any specific instructions for candidates..."
                    className="w-full resize-none rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-4 py-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <p className="mb-2 text-[16px] font-bold text-gray-600">Proctoring Rules</p>
                  <div className="space-y-2">
                    {proctoringRules.map((rule, index) => (
                      <div key={`${rule}-${index}`} className="flex items-center justify-between rounded-[10px] border border-gray-200 bg-[#f5f6f8] px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-indigo-500" />
                          <p className="text-sm text-gray-600">{rule}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProctoringRule(index)}
                          className="text-red-500 transition-colors hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2.5">
                      <input
                        type="text"
                        value={newRule}
                        onChange={(event) => setNewRule(event.target.value)}
                        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddProctoringRule(); } }}
                        placeholder="Add a new rule..."
                        className="flex-1 rounded-[10px] border border-gray-300 bg-[#f3f4f6] px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddProctoringRule}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-[10px] bg-gradient-to-r from-indigo-400 to-purple-400 px-6 py-2.5 text-sm font-semibold !text-white transition-all hover:brightness-105"
                >
                  Next Step
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="max-h-[62vh] space-y-4 overflow-y-auto bg-white p-6">
                <h4 className="text-[20px] font-extrabold text-gray-900">Review & Confirm</h4>
                <div className="rounded-[10px] border border-indigo-200 bg-indigo-50/70 p-6">
                  <h5 className="text-[16px] font-bold text-gray-900">{examTitle || "Untitled Exam"}</h5>
                  <p className="mt-2 text-sm text-gray-600">{examDescription || "No description provided."}</p>
                  <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
                    <div className="rounded-[10px] bg-white p-4 text-center">
                      <SelectedExamTypeIcon className="mx-auto h-6 w-6 text-indigo-600" />
                      <p className="mt-2 text-[18px] font-bold text-gray-900">{selectedExamType}</p>
                      <p className="text-[14px] text-gray-500">Exam Type</p>
                    </div>
                    <div className="rounded-[10px] bg-white p-4 text-center">
                      <Clock3 className="mx-auto h-6 w-6 text-indigo-600" />
                      <p className="mt-2 text-[18px] font-bold text-gray-900">{durationMinutes || 0}</p>
                      <p className="text-[14px] text-gray-500">Minutes</p>
                    </div>
                    <div className="rounded-[10px] bg-white p-4 text-center">
                      <FileText className="mx-auto h-6 w-6 text-indigo-600" />
                      <p className="mt-2 text-[18px] font-bold text-gray-900">{questions.length}</p>
                      <p className="text-[14px] text-gray-500">Questions</p>
                    </div>
                    <div className="rounded-[10px] bg-white p-4 text-center">
                      <CheckSquare className="mx-auto h-6 w-6 text-emerald-600" />
                      <p className="mt-2 text-[18px] font-bold text-gray-900">{totalPoints}</p>
                      <p className="text-[14px] text-gray-500">Total Points</p>
                    </div>
                    <div className="rounded-[10px] bg-white p-4 text-center">
                      <AlertCircle className="mx-auto h-6 w-6 text-amber-600" />
                      <p className="mt-2 text-[18px] font-bold text-gray-900">{proctoringRules.length}</p>
                      <p className="text-[14px] text-gray-500">Rules</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
                  <p className="text-sm font-semibold">Ready to Create?</p>
                  <p className="mt-1 text-sm">Please review all details carefully. Once created, the exam will be available to assign to candidates.</p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-4">
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="rounded-[10px] border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="inline-flex items-center gap-2 rounded-[10px] bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
                >
                  <Save className="h-4 w-4" />
                  {isEditMode ? "Save Changes" : "Create Exam"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}