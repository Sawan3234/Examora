import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { adminOnly } from '../middleware/auth.middleware.js';
import { getProfile, updateProfile, getFaceStatus, deleteStudent } from '../controllers/user.controller.js';

const router = express.Router();

router.use(protect);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/face-status', getFaceStatus);
router.delete('/:id', adminOnly, deleteStudent);

export default router;
