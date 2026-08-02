import express from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
} from '../controllers/exam.controller.js';

const router = express.Router();

router.use(protect);

router.get('/', getExams);
router.get('/:id', getExamById);
router.post('/', adminOnly, createExam);
router.put('/:id', adminOnly, updateExam);
router.delete('/:id', adminOnly, deleteExam);

export default router;
