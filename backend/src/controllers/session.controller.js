import Session from '../models/Session.js';
import Exam from '../models/Exam.js';
import { createSessionState } from '../services/knn.service.js';

// GET /api/sessions — admin gets all, student gets own
export const getSessions = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { student: req.user._id };
    const sessions = await Session.find(query)
      .populate('exam', 'title duration type totalPoints')
      .populate('student', 'name email faceRegisteredAt')
      .sort('-createdAt');
    res.json({ sessions });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/start — student starts a session
export const startSession = async (req, res, next) => {
  try {
    const { examId } = req.body;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    // Check if face is registered (support both single and multiple descriptors)
    const hasFaceRegistered = (req.user.faceDescriptors && req.user.faceDescriptors.length > 0) || req.user.faceDescriptor;
    if (!hasFaceRegistered) {
      return res.status(400).json({ message: 'Please register your face first' });
    }

    // Prevent duplicate active sessions
    const existing = await Session.findOne({ exam: examId, student: req.user._id, status: 'in_progress' });
    if (existing) return res.json({ session: existing });

    const session = await Session.create({
      exam: examId,
      student: req.user._id,
      status: 'in_progress',
      startedAt: new Date(),
      proctoringActive: true,
    });

    // Create session state for proctoring (in-memory)
    const sessionState = createSessionState(examId, req.user._id);
    if (!global.proctoringSessions) global.proctoringSessions = new Map();
    global.proctoringSessions.set(session._id.toString(), sessionState);

    res.status(201).json({ session });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:id/submit-answer
export const submitAnswer = async (req, res, next) => {
  try {
    const { questionId, answer } = req.body;
    const session = await Session.findOne({ _id: req.params.id, student: req.user._id });
    if (!session) return res.status(404).json({ message: 'Session not found' });

    const idx = session.answers.findIndex(a => a.questionId.toString() === questionId);
    if (idx >= 0) {
      session.answers[idx].answer = answer;
      session.answers[idx].submittedAt = new Date();
    } else {
      session.answers.push({ questionId, answer, submittedAt: new Date() });
    }
    await session.save();
    res.json({ message: 'Answer saved' });
  } catch (err) {
    next(err);
  }
};

// POST /api/sessions/:id/complete
export const completeSession = async (req, res, next) => {
  try {
    const session = await Session.findOneAndUpdate(
      { _id: req.params.id, student: req.user._id },
      { status: 'completed', completedAt: new Date(), proctoringActive: false },
      { new: true }
    );
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    // Clean up session state from memory
    if (global.proctoringSessions) {
      global.proctoringSessions.delete(req.params.id);
    }
    
    res.json({ session });
  } catch (err) {
    next(err);
  }
};

// GET /api/sessions/:id — get session details
export const getSessionById = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('exam', 'title type passingScore duration questions totalPoints')
      .populate('student', 'name email faceRegisteredAt');
      
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Get proctoring state if exists
    const proctoringState = global.proctoringSessions?.get(req.params.id);
    
    res.json({ 
      session,
      proctoringActive: !!proctoringState,
      totalScore: proctoringState?.totalScore || 0,
      flagged: proctoringState?.flagged || false
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/sessions/:id/grades - Update grades for a session
export const updateGrades = async (req, res, next) => {
  try {
    const { answers, score, totalPoints, percentage, passed } = req.body;
    
    const session = await Session.findById(req.params.id);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Update answers with scores and feedback
    if (answers && Array.isArray(answers)) {
      answers.forEach((updatedAnswer, index) => {
        if (session.answers[index]) {
          session.answers[index].score = updatedAnswer.score;
          session.answers[index].feedback = updatedAnswer.feedback;
        }
      });
    }
    
    // Update session grading info
    session.score = score;
    session.totalPoints = totalPoints;
    session.percentage = percentage;
    session.passed = passed;
    session.gradedAt = new Date();
    
    await session.save();
    
    const populatedSession = await Session.findById(req.params.id)
      .populate('exam', 'title type passingScore questions totalPoints')
      .populate('student', 'name email');
    
    res.json({ 
      success: true,
      session: populatedSession,
      message: 'Grades saved successfully!'
    });
  } catch (err) {
    console.error('Error updating grades:', err);
    next(err);
  }
};