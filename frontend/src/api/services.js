import api from "./client.js";
import axios from "axios";

// ====== BACKEND API CALLS (Port 5000) ======
export const authAPI = {
  register: (name, email, password) =>
    api.post("/auth/register", { name, email, password }),

  login: (email, password) => api.post("/auth/login", { email, password }),

  getMe: () => api.get("/auth/me"),

  registerFace: (frameBase64) =>
    api.post("/auth/register-face", { frameBase64 }),
};

export const examAPI = {
  list: () => api.get("/exams"),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post("/exams", data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
};

export const sessionAPI = {
  list: () => api.get("/sessions"),
  getById: (id) => api.get(`/sessions/${id}`),
  start: (examId) => api.post("/sessions/start", { examId }),
  submitAnswer: (sessionId, questionId, answer) =>
    api.post(`/sessions/${sessionId}/submit-answer`, { questionId, answer }),
  complete: (sessionId) => api.post(`/sessions/${sessionId}/complete`),
  updateGrades: (sessionId, gradeData) =>
    api.put(`/sessions/${sessionId}/grades`, gradeData),
};

// ====== PROCTORING API ======
export const proctoringAPI = {
  verify: async (data) => {
    const payload = {
      sessionId: data.sessionId || data,
      liveDescriptor: data.liveDescriptor || [],
      headPose: data.headPose || { yaw: 0, pitch: 0, roll: 0 },
      gazeAngle: data.gazeAngle || { x: 0, y: 0 },
      faceCount: data.faceCount || 0,
      frameImage: data.frameImage || '',
      violations: data.violations || [],
      isFullscreen: data.isFullscreen !== undefined ? data.isFullscreen : !!document.fullscreenElement,
      hasFocus: data.hasFocus !== undefined ? data.hasFocus : document.hasFocus()
    };
    
    return api.post('/proctoring/verify', payload);
  },

  verifyIdentity: (liveDescriptor, sessionId) =>
    api.post("/proctoring/verify-identity", { liveDescriptor, sessionId }),

  logTabSwitch: (sessionId) =>
    api.post("/proctoring/tab-switch", { sessionId }),

  getViolations: (sessionId) =>
    api.get(`/proctoring/session/${sessionId}/violations`),

  flagSession: (sessionId, reason) =>
    api.post(`/proctoring/session/${sessionId}/flag`, { reason }),

  logAudioViolation: (sessionId, violation) =>
    api.post("/proctoring/audio-violation", { sessionId, violation }),
  
  getAudioViolations: (sessionId) =>
    api.get(`/proctoring/session/${sessionId}/audio-violations`),

  getAudioStats: (sessionId) =>
    api.get(`/proctoring/session/${sessionId}/audio-stats`),
};

export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (name, email) => api.put("/users/profile", { name, email }),
  getFaceStatus: () => api.get("/users/face-status"),
  deleteStudent: (id) => api.delete(`/users/${id}`),
};

// ====== PYTHON SERVICE API CALLS (Port 5001) ======
const PYTHON_API_URL = import.meta.env.VITE_PYTHON_URL || 'http://localhost:5001';
const pythonApi = axios.create({ baseURL: PYTHON_API_URL });

export const faceAPI = {
  registerFace: (image, studentId) =>
    pythonApi.post("/register-face", { image, studentId }),
  
  verifyFace: (image, studentId) =>
    pythonApi.post("/verify-face", { image, studentId }),
  
  analyzeFrame: (image) =>
    pythonApi.post("/analyze-frame", { image }),
  
  logAudioViolation: (sessionId, violation) =>
    pythonApi.post("/log-audio-violation", { sessionId, violation }),
  
  getAudioViolations: (sessionId) =>
    pythonApi.get(`/get-audio-violations/${sessionId}`),
  
  getStatus: () =>
    pythonApi.get("/status"),
  
  getHealth: () =>
    pythonApi.get("/health"),
};