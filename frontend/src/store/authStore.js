import { create } from 'zustand';
import { authAPI } from '../api/services.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await authAPI.register(name, email, password);
      localStorage.setItem('token', data.token);
      set({ user: data.user, token: data.token, loading: false });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.message || 'Registration failed', loading: false });
      return false;
    }
  },

  login: async (email, password) => {
  set({ loading: true, error: null });
  try {
    const { data } = await authAPI.login(email, password);
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token, loading: false });
    return data.user; // ✅ Returns the user object
  } catch (err) {
    set({ error: err.response?.data?.message || 'Login failed', loading: false });
    return null;
  }
},
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await authAPI.getMe();
      set({ user: data.user });
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  },

registerFace: async (frameBase64) => {
  try {
    const response = await authAPI.registerFace(frameBase64);
    set(state => ({
      user: { ...state.user, faceDescriptor: true, faceRegisteredAt: new Date() }
    }));
    return true;
  } catch (err) {
    console.error('Face registration failed:', err);
    throw err;
  }
},
}));