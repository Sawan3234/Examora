/**
 * PROPER KNN Face Verification Service for Exam Proctoring
 * 
 * Features:
 * - Multiple face enrollment (3-5 samples per student)
 * - Identity verification with temporal smoothing
 * - Behavior analysis with cumulative scoring
 * - Frame-by-frame violation logging with context
 */

const MATCH_THRESHOLD = 0.6;      // Euclidean distance threshold (face_recognition default)
const REVERIFY_INTERVAL = 150;    // Re-verify identity every 150 frames (~5 seconds)
const VIOLATION_WINDOW = 30;      // Count violations from last 30 seconds
const FLAG_THRESHOLD = 5;         // Flag exam when score >= 5

// Severity weights
const SEVERITY_SCORES = {
  low: 1,
  medium: 3,
  high: 10
};

/**
 * Euclidean distance between two vectors
 */
function euclideanDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

/**
 * KNN with k=1 - Find closest match from enrolled faces
 */
export function findBestMatch(liveDescriptor, enrolledDescriptors) {
  if (!enrolledDescriptors || enrolledDescriptors.length === 0) {
    return { matched: false, distance: Infinity, confidence: 0 };
  }

  let bestDistance = Infinity;
  let bestIndex = -1;

  for (let i = 0; i < enrolledDescriptors.length; i++) {
    const distance = euclideanDistance(liveDescriptor, enrolledDescriptors[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  const matched = bestDistance < MATCH_THRESHOLD;
  const confidence = Math.max(0, 1 - bestDistance / (MATCH_THRESHOLD * 2));

  return { matched, distance: bestDistance, confidence, bestIndex };
}

/**
 * Verify identity using temporal smoothing
 * Looks at last N frames to make decision
 */
export function verifyIdentityWithSmoothing(recentMatches, requiredConfirmations = 3) {
  if (recentMatches.length < requiredConfirmations) {
    return { verified: false, confidence: 0, needMore: true };
  }

  const lastNFrames = recentMatches.slice(-requiredConfirmations);
  const confirmedCount = lastNFrames.filter(m => m.matched).length;
  
  const verified = confirmedCount >= requiredConfirmations - 1;
  const confidence = confirmedCount / requiredConfirmations;

  return { verified, confidence, needMore: false };
}

/**
 * Analyze frame for proctoring violations
 * Returns violations with severity scores
 */
export function analyzeFrameForViolations({ 
  faceCount, 
  headPose, 
  gazeAngle, 
  imageQuality,
  identityVerified,
  identityConfidence 
}) {
  const violations = [];
  let runningScore = 0;

  // CRITICAL: Identity failure overrides everything
  if (!identityVerified && identityConfidence < 0.5) {
    violations.push({
      type: 'identity_failure',
      severity: 'high',
      score: SEVERITY_SCORES.high,
      message: 'Face does not match registered student',
      metadata: { confidence: identityConfidence }
    });
    runningScore += SEVERITY_SCORES.high;
    return { violations, runningScore };
  }

  // Multiple faces detected
  if (faceCount > 1) {
    violations.push({
      type: 'multiple_faces',
      severity: 'high',
      score: SEVERITY_SCORES.high,
      message: `${faceCount} faces detected in frame`,
      metadata: { faceCount }
    });
    runningScore += SEVERITY_SCORES.high;
  }

  // No face detected
  if (faceCount === 0) {
    violations.push({
      type: 'no_face',
      severity: 'medium',
      score: SEVERITY_SCORES.medium,
      message: 'No face detected in frame',
      metadata: {}
    });
    runningScore += SEVERITY_SCORES.medium;
  }

  if (faceCount === 1 && identityVerified) {
    // Head pose violation
    if (headPose) {
      if (Math.abs(headPose.yaw) > 30) {
        const severity = Math.abs(headPose.yaw) > 45 ? 'high' : 'medium';
        violations.push({
          type: 'head_pose',
          severity,
          score: SEVERITY_SCORES[severity],
          message: `Head turned ${headPose.yaw.toFixed(1)}° ${headPose.yaw > 0 ? 'right' : 'left'}`,
          metadata: { yaw: headPose.yaw, pitch: headPose.pitch }
        });
        runningScore += SEVERITY_SCORES[severity];
      }
      
      if (Math.abs(headPose.pitch) > 25) {
        violations.push({
          type: 'head_pose',
          severity: 'medium',
          score: SEVERITY_SCORES.medium,
          message: `Head tilted ${headPose.pitch > 0 ? 'up' : 'down'} ${Math.abs(headPose.pitch).toFixed(1)}°`,
          metadata: { pitch: headPose.pitch }
        });
        runningScore += SEVERITY_SCORES.medium;
      }
    }

    // Gaze deviation
    if (gazeAngle) {
      const deviation = Math.sqrt(gazeAngle.x ** 2 + gazeAngle.y ** 2);
      if (deviation > 25) {
        const severity = deviation > 40 ? 'high' : 'medium';
        violations.push({
          type: 'gaze_deviation',
          severity,
          score: SEVERITY_SCORES[severity],
          message: `Eyes ${deviation.toFixed(1)}° off screen`,
          metadata: { gazeX: gazeAngle.x, gazeY: gazeAngle.y, deviation }
        });
        runningScore += SEVERITY_SCORES[severity];
      }
    }

    // Poor image quality
    if (imageQuality && imageQuality < 0.3) {
      violations.push({
        type: 'poor_quality',
        severity: 'low',
        score: SEVERITY_SCORES.low,
        message: 'Poor lighting or blurry face detected',
        metadata: { quality: imageQuality }
      });
      runningScore += SEVERITY_SCORES.low;
    }
  }

  return { violations, runningScore };
}

/**
 * Update session state with new frame analysis
 * Uses rolling window for violation scoring
 */
export function updateSessionState(sessionState, currentTime, newViolations, newScore) {
  // Add current frame violations
  sessionState.frameHistory.push({
    timestamp: currentTime,
    violations: newViolations,
    score: newScore
  });

  // Keep only last VIOLATION_WINDOW seconds
  const cutoffTime = currentTime - VIOLATION_WINDOW;
  sessionState.frameHistory = sessionState.frameHistory.filter(f => f.timestamp > cutoffTime);

  // Recalculate total score from recent window
  sessionState.totalScore = sessionState.frameHistory.reduce((sum, f) => sum + f.score, 0);

  // Check if exam should be flagged
  sessionState.flagged = sessionState.totalScore >= FLAG_THRESHOLD;

  // Update continuous violation counter
  if (newViolations.length > 0) {
    sessionState.consecutiveViolations++;
  } else {
    sessionState.consecutiveViolations = 0;
  }

  // Flag if too many consecutive violations
  if (sessionState.consecutiveViolations > 10) {
    sessionState.flagged = true;
    sessionState.consecutiveViolations = 0;
  }

  return sessionState;
}

/**
 * Create initial session state
 */
export function createSessionState(examId, studentId) {
  return {
    examId,
    studentId,
    startTime: Date.now(),
    frameHistory: [],
    totalScore: 0,
    flagged: false,
    consecutiveViolations: 0,
    identityConfirmed: false,
    identityHistory: []
  };
}

/**
 * Enrollment: Add new face descriptor to student's profile
 */
export function enrollFace(existingDescriptors, newDescriptor, maxSamples = 5) {
  if (!existingDescriptors) existingDescriptors = [];
  
  // Don't exceed max samples
  if (existingDescriptors.length >= maxSamples) {
    return { 
      success: false, 
      descriptors: existingDescriptors, 
      message: 'Maximum enrollment samples reached' 
    };
  }

  // Check if this is similar to existing (avoid duplicate enrollment)
  if (existingDescriptors.length > 0) {
    const { distance } = findBestMatch(newDescriptor, existingDescriptors);
    if (distance < 0.3) {
      return {
        success: false,
        descriptors: existingDescriptors,
        message: 'Face too similar to existing enrollment'
      };
    }
  }

  existingDescriptors.push(newDescriptor);
  return {
    success: true,
    descriptors: existingDescriptors,
    message: `Enrolled successfully (${existingDescriptors.length}/${maxSamples} samples)`
  };
}