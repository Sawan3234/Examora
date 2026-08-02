import mongoose from "mongoose";

const violationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "face_not_detected",
        "multiple_faces",
        "face_mismatch",
        "gaze_deviation",
        "gaze_off_screen",
        "head_pose",
        "head_turned",
        "head_tilted",
        "tab_switch",
        "gadget_detected",
        "fullscreen_exit",
        "window_focus_lost",
        "no_face",
        "manual_flag",
        "identity_failure",
        "poor_quality",
        "hands_detected",
        "speech_detected",
        "suspicious_audio",
        "student_absent",
        "external_help",
        "prolonged_silence",
        "multiple_speakers",
        "loud_noise"
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    score: {
      type: Number,
      default: 0,
    },
    message: {
      type: String,
      default: "",
    },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: true },
);

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
    answer: { type: String, default: "" },
    submittedAt: { type: Date, default: null },
    score: { type: Number, default: null },
    feedback: { type: String, default: "" },
  },
  { _id: true },
);

const sessionSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "flagged", "terminated"],
      default: "pending",
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    answers: {
      type: [answerSchema],
      default: [],
    },
    violations: {
      type: [violationSchema],
      default: [],
    },
    violationScore: {
      type: Number,
      default: 0,
    },
    flaggedReason: {
      type: String,
      default: null,
    },
    flaggedAt: {
      type: Date,
      default: null,
    },
    score: { type: Number, default: null },
    totalPoints: { type: Number, default: null },
    percentage: { type: Number, default: null },
    passed: { type: Boolean, default: false },
    gradedAt: { type: Date, default: null },
    proctoringActive: { type: Boolean, default: false },
    identityVerified: { type: Boolean, default: false },
    identityConfidence: { type: Number, default: null },
  },
  { timestamps: true },
);

sessionSchema.virtual("violationCount").get(function () {
  if (!this.violations || !Array.isArray(this.violations)) {
    return 0;
  }
  return this.violations.length;
});

sessionSchema.virtual("highSeverityViolations").get(function () {
  if (!this.violations || !Array.isArray(this.violations)) {
    return 0;
  }
  return this.violations.filter((v) => v.severity === "high").length;
});

sessionSchema.virtual("audioViolations").get(function () {
  if (!this.violations || !Array.isArray(this.violations)) {
    return [];
  }
  return this.violations.filter(v => 
    ["speech_detected", "suspicious_audio", "student_absent", "external_help", "prolonged_silence", "multiple_speakers", "loud_noise"].includes(v.type)
  );
});

sessionSchema.virtual("audioViolationCount").get(function () {
  return this.audioViolations.length;
});

sessionSchema.set("toJSON", { virtuals: true });
sessionSchema.set("toObject", { virtuals: true });

export default mongoose.model("Session", sessionSchema);