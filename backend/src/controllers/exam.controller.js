import Exam from '../models/Exam.js';

// GET /api/exams
export const getExams = async (req, res, next) => {
  try {
    let exams;
    
    if (req.user.role === 'admin') {
      // Admin sees exams they created
      exams = await Exam.find({ createdBy: req.user._id })
        .populate('createdBy', 'name email')
        .sort('-createdAt');
    } else {
      // Students see all active/scheduled exams
      exams = await Exam.find({ 
        status: { $in: ['scheduled', 'active'] }
      })
      .populate('createdBy', 'name email')
      .sort('-createdAt');
    }
    
    res.json({ exams });
  } catch (err) {
    next(err);
  }
};

// GET /api/exams/:id
export const getExamById = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id).populate('createdBy', 'name email');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

// POST /api/exams
export const createExam = async (req, res, next) => {
  try {
    const User = await import('../models/User.js').then(m => m.default);
    
    // Get all active students to auto-assign
    const allStudents = await User.find({ role: 'student', isActive: true }).select('_id');
    const studentIds = allStudents.map(s => s._id);
    
    const exam = await Exam.create({ 
      ...req.body, 
      createdBy: req.user._id,
      participants: studentIds,
      status: req.body.status || 'scheduled'
    });
    
    res.status(201).json({ exam });
  } catch (err) {
    next(err);
  }
};

// PUT /api/exams/:id
export const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: 'Exam not found or not authorized' });
    res.json({ exam });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/exams/:id
export const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!exam) return res.status(404).json({ message: 'Exam not found or not authorized' });
    res.json({ message: 'Exam deleted' });
  } catch (err) {
    next(err);
  }
};