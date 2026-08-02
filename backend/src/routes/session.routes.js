import express from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware.js';
import {
  getSessions,
  startSession,
  submitAnswer,
  completeSession,
  getSessionById,
  updateGrades,
} from '../controllers/session.controller.js';;

const router = express.Router();

router.use(protect);

router.get('/', getSessions);
router.post('/start', startSession);
router.post('/:id/submit-answer', submitAnswer);
router.post('/:id/complete', completeSession);
router.get('/:id', getSessionById);
router.put('/:id/grades', protect, adminOnly, updateGrades); // Make sure this is present


export default router;
