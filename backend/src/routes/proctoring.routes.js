// backend/routes/proctoring.routes.js (UPDATED)

import express from 'express';
import {
  verifyProctoring,
  verifyIdentityOnce,
  logTabSwitch,
  getSessionViolations,
  flagSession,
  // New audio violation handlers
  logAudioViolation,
  getAudioViolations,
  getAudioStats,
  clearAudioCache
} from '../controllers/proctoring.controller.js';
import { protect } from '../middleware/auth.middleware.js';
const router = express.Router();

// All routes require authentication
router.use(protect);

// Existing routes
router.post('/verify', verifyProctoring);
router.post('/verify-identity', verifyIdentityOnce);
router.post('/tab-switch', logTabSwitch);
router.get('/session/:id/violations', getSessionViolations);
router.post('/session/:id/flag', flagSession);

// NEW audio violation routes
router.post('/audio-violation', logAudioViolation);
router.get('/session/:sessionId/audio-violations', getAudioViolations);
router.get('/session/:sessionId/audio-stats', getAudioStats);
router.delete('/session/:sessionId/audio-cache', clearAudioCache);

export default router;