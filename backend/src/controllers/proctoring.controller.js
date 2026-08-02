// backend/controllers/proctoring.controller.js (UPDATED)

import Session from '../models/Session.js';
import { pythonAPI } from '../services/python.service.js';

const sessionStates = new Map();
const audioViolationCache = new Map(); // For rate limiting

// Map Python violation types to Mongoose enum values
const violationMap = {
  'head_turned': 'head_pose',
  'head_tilted': 'head_pose',
  'head_rolled': 'head_pose',
  'gaze_off_screen': 'gaze_deviation',
  'gaze_deviation': 'gaze_deviation',
  'hands_detected': 'gadget_detected',
  'gadget_detected': 'gadget_detected',
  'no_face': 'face_not_detected',
  'multiple_faces': 'multiple_faces',
  'face_mismatch': 'face_mismatch',
  'tab_switch': 'tab_switch',
  'eyes_closed': 'gaze_deviation',
  'image_blur': 'poor_quality',
  // Audio violation mappings
  'speech_detected': 'speech_detected',
  'loud_noise': 'suspicious_audio',
  'prolonged_silence': 'student_absent',
  'multiple_speakers': 'external_help'
};

export const verifyProctoring = async (req, res, next) => {
  try {
    console.log('📥 Received proctoring data:', req.body);
    
    const { 
      sessionId, 
      frameImage, 
      hasFocus,
      liveDescriptor,
      headPose,
      gazeAngle,
      faceCount,
      violations: frontendViolations 
    } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required' });
    }
    
    const session = await Session.findById(sessionId).populate('student');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    let sessionState = sessionStates.get(sessionId);
    if (!sessionState) {
      sessionState = { 
        frameCount: 0, 
        totalScore: 0, 
        identityConfirmed: false,
        audioViolationCount: 0,
        lastAudioCheck: Date.now()
      };
      sessionStates.set(sessionId, sessionState);
    }
    
    const violations = [];
    let runningScore = 0;
    let identityVerified = sessionState.identityConfirmed;
    
    // ===== PROCESS FRONTEND VIOLATIONS (Head Pose, Gaze, etc.) =====
    if (frontendViolations && frontendViolations.length > 0) {
      console.log('📊 Frontend violations:', frontendViolations);
      for (const v of frontendViolations) {
        const mappedType = violationMap[v.type] || v.type;
        const severity = v.severity || 'medium';
        const score = v.score || (severity === 'high' ? 10 : 5);
        
        violations.push({
          type: mappedType,
          severity: severity,
          score: score,
          timestamp: new Date(),
          metadata: { 
            original_type: v.type, 
            value: v.value,
            source: 'frontend'
          }
        });
        runningScore += score;
      }
    }
    
    // ===== PROCESS HEAD POSE FROM FRONTEND =====
    if (headPose) {
      if (Math.abs(headPose.yaw || 0) > 25) {
        violations.push({
          type: 'head_pose',
          severity: 'medium',
          score: 5,
          timestamp: new Date(),
          metadata: { yaw: headPose.yaw, source: 'frontend' }
        });
        runningScore += 5;
      }
      if (Math.abs(headPose.pitch || 0) > 25) {
        violations.push({
          type: 'head_pose',
          severity: 'medium',
          score: 5,
          timestamp: new Date(),
          metadata: { pitch: headPose.pitch, source: 'frontend' }
        });
        runningScore += 5;
      }
    }
    
    // ===== PROCESS GAZE FROM FRONTEND =====
    if (gazeAngle) {
      const gazeMagnitude = Math.sqrt(
        (gazeAngle.x || 0) * (gazeAngle.x || 0) + 
        (gazeAngle.y || 0) * (gazeAngle.y || 0)
      );
      if (gazeMagnitude > 20) {
        violations.push({
          type: 'gaze_deviation',
          severity: 'medium',
          score: 5,
          timestamp: new Date(),
          metadata: { gazeX: gazeAngle.x, gazeY: gazeAngle.y, source: 'frontend' }
        });
        runningScore += 5;
      }
    }
    
    // ===== FACE COUNT VIOLATIONS =====
    if (faceCount === 0) {
      violations.push({
        type: 'face_not_detected',
        severity: 'high',
        score: 10,
        timestamp: new Date()
      });
      runningScore += 10;
    } else if (faceCount > 1) {
      violations.push({
        type: 'multiple_faces',
        severity: 'high',
        score: 10,
        timestamp: new Date()
      });
      runningScore += 10;
    }
    
    // ===== CALL PYTHON SERVICE FOR FACE VERIFICATION =====
    if (frameImage && session.student) {
  try {
    const knnResult = await pythonAPI.verifyFace(
      frameImage,
      session.student._id.toString()
    );

    console.log("========== FACE VERIFICATION ==========");
    console.log("Student ID:", session.student._id.toString());
    console.log("Python Result:", knnResult);
    console.log("=======================================");

    identityVerified = knnResult.verified;
    sessionState.identityConfirmed = identityVerified;

    if (!identityVerified) {
      console.log("❌ FACE MISMATCH DETECTED");

      violations.push({
        type: "face_mismatch",
        severity: "high",
        score: 10,
        timestamp: new Date(),
      });

      runningScore += 10;
    } else {
      console.log("✅ FACE VERIFIED");
    }
  } catch (err) {
    console.error("Python verification error:", err);
  }
}
    // ===== BROWSER FOCUS CHECK =====
    if (hasFocus === false) {
      violations.push({
        type: 'window_focus_lost',
        severity: 'medium',
        score: 3,
        timestamp: new Date()
      });
      runningScore += 3;
    }
    
    // ===== SAVE VIOLATIONS =====
    for (const v of violations) {
      session.violations.push({
        type: v.type,
        severity: v.severity,
        timestamp: v.timestamp,
        metadata: v.metadata || {}
      });
    }
    
    // ===== UPDATE SESSION STATE =====
    sessionState.totalScore += runningScore;
    sessionState.frameCount++;
    sessionStates.set(sessionId, sessionState);
    
    // ===== FLAG SESSION IF TOO MANY VIOLATIONS =====
    if (sessionState.totalScore >= 30 && session.status === 'in_progress') {
      session.status = 'flagged';
      session.flaggedReason = `Excessive violations: ${sessionState.totalScore} points`;
      session.flaggedAt = new Date();
    }
    
    session.identityVerified = identityVerified;
    session.violationScore = sessionState.totalScore;
    await session.save();
    
    console.log(`✅ Proctoring: verified=${identityVerified}, violations=${violations.length}, totalScore=${sessionState.totalScore}`);
    
    res.json({
      identityVerified: identityVerified,
      violations: violations.length,
      violationTypes: violations.map(v => v.type),
      totalScore: sessionState.totalScore,
      flagged: sessionState.totalScore >= 30,
      frameNumber: sessionState.frameCount
    });
    
  } catch (err) {
    console.error('Proctoring error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ========== NEW AUDIO VIOLATION HANDLERS ==========

/**
 * Log audio violation from frontend audio monitoring
 */
export const logAudioViolation = async (req, res) => {
  try {
    const { sessionId, violation } = req.body;

    if (!sessionId || !violation) {
      return res.status(400).json({ 
        success: false, 
        message: 'SessionId and violation are required' 
      });
    }

    // Find session
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Rate limiting - prevent spam (max 1 violation per 2 seconds per type)
    const cacheKey = `${sessionId}_${violation.type}`;
    const now = Date.now();
    const lastViolation = audioViolationCache.get(cacheKey);
    
    if (lastViolation && (now - lastViolation) < 2000) {
      return res.status(429).json({ 
        success: false, 
        message: 'Rate limited - too many violations' 
      });
    }
    
    audioViolationCache.set(cacheKey, now);
    
    // Clean up old cache entries after 5 minutes
    setTimeout(() => {
      if (audioViolationCache.get(cacheKey) === now) {
        audioViolationCache.delete(cacheKey);
      }
    }, 300000);

    // Map violation type
    const mappedType = violationMap[violation.type] || violation.type;
    
    // Calculate score based on severity
    const scoreMap = { high: 10, medium: 5, low: 2 };
    const score = scoreMap[violation.severity] || 3;

    // Create violation object
    const violationData = {
      type: mappedType,
      severity: violation.severity,
      score: score,
      message: violation.message,
      timestamp: new Date(),
      metadata: {
        source: 'audio',
        original_type: violation.type,
        level: violation.level,
        duration: violation.duration,
        ...violation.metadata
      }
    };

    // Add to session violations
    session.violations.push(violationData);
    
    // Update session state
    let sessionState = sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.totalScore += score;
      sessionState.audioViolationCount = (sessionState.audioViolationCount || 0) + 1;
      sessionState.lastAudioCheck = now;
      sessionStates.set(sessionId, sessionState);
    }
    
    // Update violation score on session
    session.violationScore = (session.violationScore || 0) + score;
    
    // Auto-flag session if violation score exceeds threshold
    if (session.violationScore >= 30 && session.status !== 'flagged') {
      session.status = 'flagged';
      session.flaggedReason = `Excessive violations: ${session.violationScore} points from audio violations`;
      session.flaggedAt = new Date();
    }
    
    await session.save();

    // Also log to Python service for analytics
    try {
      await pythonAPI.logAudioViolation(sessionId, violationData);
    } catch (err) {
      console.error('Failed to log audio violation to Python:', err.message);
    }

    console.log(`🔊 Audio violation logged: ${violation.type} for session ${sessionId}, score: ${score}`);

    res.json({ 
      success: true, 
      message: 'Audio violation logged',
      violationScore: session.violationScore,
      flagged: session.status === 'flagged',
      totalScore: sessionState?.totalScore || session.violationScore
    });

  } catch (err) {
    console.error('Error logging audio violation:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all audio violations for a session
 */
export const getAudioViolations = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId)
      .populate('student', 'name email')
      .populate('exam', 'title');
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    // Filter audio violations
    const audioViolations = session.violations.filter(v => 
      v.metadata?.source === 'audio' || 
      ['speech_detected', 'suspicious_audio', 'student_absent', 'external_help'].includes(v.type)
    );
    
    // Group by type for statistics
    const violationsByType = {};
    audioViolations.forEach(v => {
      const type = v.type;
      violationsByType[type] = (violationsByType[type] || 0) + 1;
    });
    
    // Group by severity
    const violationsBySeverity = { high: 0, medium: 0, low: 0 };
    audioViolations.forEach(v => {
      violationsBySeverity[v.severity] = (violationsBySeverity[v.severity] || 0) + 1;
    });
    
    res.json({
      sessionId: session._id,
      student: session.student,
      exam: session.exam,
      audioViolations: audioViolations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      totalAudioViolations: audioViolations.length,
      violationsByType,
      violationsBySeverity,
      violationScore: session.violationScore || 0,
      isFlagged: session.status === 'flagged',
      flaggedReason: session.flaggedReason || null
    });
    
  } catch (err) {
    console.error('Error getting audio violations:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get audio monitoring statistics for a session
 */
export const getAudioStats = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    const audioViolations = session.violations.filter(v => 
      v.metadata?.source === 'audio' || 
      ['speech_detected', 'suspicious_audio', 'student_absent', 'external_help'].includes(v.type)
    );
    
    // Get recent violations (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentViolations = audioViolations.filter(v => new Date(v.timestamp) > fiveMinutesAgo);
    
    // Get violation timeline by minute
    const timeline = {};
    audioViolations.forEach(v => {
      const minute = new Date(v.timestamp).toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
      timeline[minute] = (timeline[minute] || 0) + 1;
    });
    
    // Get session state
    const sessionState = sessionStates.get(sessionId);
    
    res.json({
      sessionId: session._id,
      totalAudioViolations: audioViolations.length,
      recentViolationsCount: recentViolations.length,
      recentViolations: recentViolations.slice(-10),
      timeline,
      violationScore: session.violationScore || 0,
      sessionState: sessionState ? {
        totalScore: sessionState.totalScore,
        audioViolationCount: sessionState.audioViolationCount || 0,
        lastAudioCheck: sessionState.lastAudioCheck
      } : null,
      isFlagged: session.status === 'flagged',
      flaggedReason: session.flaggedReason || null
    });
    
  } catch (err) {
    console.error('Error getting audio stats:', err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Clear audio violation cache for a session (useful for testing)
 */
export const clearAudioCache = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    // Clear from in-memory cache
    for (const key of audioViolationCache.keys()) {
      if (key.startsWith(sessionId)) {
        audioViolationCache.delete(key);
      }
    }
    
    // Reset session state
    const sessionState = sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.audioViolationCount = 0;
      sessionStates.set(sessionId, sessionState);
    }
    
    res.json({ success: true, message: 'Audio cache cleared' });
    
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Keep existing functions
export const verifyIdentityOnce = async (req, res, next) => {
  try {
    const { frameImage, sessionId } = req.body;
    
    const session = await Session.findById(sessionId).populate('student');
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    
    if (!frameImage || !session.student) {
      return res.json({ verified: true, confidence: 0.9 });
    }
    
    const knnResult = await pythonAPI.verifyFace(frameImage, session.student._id.toString());
    res.json({ verified: knnResult.verified, confidence: knnResult.confidence });
    
  } catch (err) {
    console.error('Verify identity error:', err);
    res.status(500).json({ message: err.message });
  }
};

export const logTabSwitch = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    
    session.violations.push({
      type: 'tab_switch',
      severity: 'medium',
      score: 3,
      timestamp: new Date(),
      metadata: { source: 'browser' }
    });
    
    // Update score
    session.violationScore = (session.violationScore || 0) + 3;
    
    // Update session state
    let sessionState = sessionStates.get(sessionId);
    if (sessionState) {
      sessionState.totalScore += 3;
      sessionStates.set(sessionId, sessionState);
    }
    
    await session.save();
    res.json({ message: 'Tab switch logged' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getSessionViolations = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('student', 'name email')
      .populate('exam', 'title');
    if (!session) return res.status(404).json({ message: 'Session not found' });
    res.json({ violations: session.violations, session });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const flagSession = async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    session.status = 'flagged';
    session.flaggedReason = req.body.reason || 'Flagged by admin';
    session.flaggedAt = new Date();
    await session.save();
    res.json({ message: 'Session flagged', sessionId: session._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};