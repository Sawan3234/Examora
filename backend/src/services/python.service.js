// backend/services/python.service.js (UPDATED)

import axios from 'axios';
import FormData from 'form-data';

const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

export const pythonAPI = {
  /**
   * Register face for a student
   */
  registerFace: async (imageBase64, studentId) => {
    try {
      const response = await axios.post(`${PYTHON_URL}/register-face`, {
        image: imageBase64,
        studentId: studentId
      });
      return response.data;
    } catch (err) {
      console.error('Python register face error:', err.response?.data || err.message);
      throw err;
    }
  },

  /**
   * Verify face against registered faces
   */
  verifyFace: async (imageBase64, studentId) => {
    try {
      const response = await axios.post(`${PYTHON_URL}/verify-face`, {
        image: imageBase64,
        studentId: studentId
      });
      return response.data;
    } catch (err) {
      console.error('Python verify face error:', err.response?.data || err.message);
      return { verified: false, confidence: 0, error: err.message };
    }
  },

  /**
   * Analyze frame for violations (face count, etc.)
   */
  analyzeFrame: async (imageBase64, sessionId) => {
    try {
      const response = await axios.post(`${PYTHON_URL}/analyze-frame`, {
        image: imageBase64,
        sessionId: sessionId
      });
      return response.data;
    } catch (err) {
      console.error('Python analyze frame error:', err.response?.data || err.message);
      return { faceCount: 0, violations: [] };
    }
  },

  /**
   * Log audio violation to Python service for analytics
   */
  logAudioViolation: async (sessionId, violation) => {
    try {
      const response = await axios.post(`${PYTHON_URL}/log-audio-violation`, {
        sessionId: sessionId,
        type: violation.type,
        severity: violation.severity,
        metadata: violation.metadata
      });
      return response.data;
    } catch (err) {
      console.error('Python log audio violation error:', err.message);
      // Don't throw - this is non-critical
      return { success: false };
    }
  },

  /**
   * Get audio violations from Python service
   */
  getAudioViolations: async (sessionId) => {
    try {
      const response = await axios.get(`${PYTHON_URL}/get-audio-violations/${sessionId}`);
      return response.data;
    } catch (err) {
      console.error('Python get audio violations error:', err.message);
      return { violations: [] };
    }
  },

  /**
   * Health check
   */
  healthCheck: async () => {
    try {
      const response = await axios.get(`${PYTHON_URL}/health`);
      return response.data;
    } catch (err) {
      return { status: 'unhealthy', error: err.message };
    }
  }
};