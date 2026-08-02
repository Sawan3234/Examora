import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, enum: ['writing', 'multiple-choice', 'coding'], default: 'writing' },
  points: { type: Number, default: 10, min: 0 },
  options: [{
    id: Number,
    text: String,
  }],
  correctOption: { type: Number, default: null },
  testCases: [{
    id: Number,
    input: String,
    output: String,
  }],
}, { _id: true });

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
  },
  type: {
    type: String,
    enum: ['writing', 'multiple-choice', 'coding'],
    required: true,
  },
  duration: {
    type: Number,
    required: true,
    min: 1,
  },
  passingScore: {
    type: Number,
    default: 60,
    min: 0,
    max: 100,
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  generalInstructions: {
    type: String,
    default: '',
  },
  proctoringRules: {
    type: [String],
    default: [
      'Camera must be enabled throughout the exam',
      'No switching tabs or windows during the exam',
      'Face must be visible at all times',
      'No external materials or devices allowed',
    ],
  },
  questions: {
    type: [questionSchema],
    default: []  // Add default empty array
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'completed'],
    default: 'scheduled',
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []  // Add default empty array
  }],
}, { timestamps: true });

// Virtual: total points - Add null check
examSchema.virtual('totalPoints').get(function () {
  if (!this.questions || !Array.isArray(this.questions)) {
    return 0;
  }
  return this.questions.reduce((sum, q) => sum + (q.points || 0), 0);
});

examSchema.set('toJSON', { virtuals: true });
examSchema.set('toObject', { virtuals: true });

export default mongoose.model('Exam', examSchema);