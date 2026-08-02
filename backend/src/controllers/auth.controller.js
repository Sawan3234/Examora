import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';
import { pythonAPI } from '../services/python.service.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: role === 'admin' ? 'admin' : 'student' });
    const token = signToken(user._id, user.role);
    res.status(201).json({ token, user });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });
    const token = signToken(user._id, user.role);
    const { password: _, ...safeUser } = user.toObject();
    res.json({ token, user: safeUser });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  const user = req.user.toObject();
  res.json({ user });
};

export const registerFace = async (req, res, next) => {
  try {
    const { frameBase64 } = req.body;
    
    console.log('📸 Register face request received');
    console.log('Has frameBase64:', !!frameBase64);
    console.log('frameBase64 length:', frameBase64?.length);
    
    if (!frameBase64) {
      return res.status(400).json({ message: 'frameBase64 is required' });
    }
    
    const pythonResult = await pythonAPI.registerFace(frameBase64, req.user._id.toString());
    
    if (!pythonResult.success) {
      return res.status(400).json({ message: pythonResult.error });
    }
    
    if (!req.user.faceDescriptors) req.user.faceDescriptors = [];
    req.user.faceDescriptors.push(pythonResult.embedding);
    req.user.faceRegisteredAt = new Date();
    await req.user.save();
    
    res.json({ 
      message: 'Face registered',
      samplesCollected: req.user.faceDescriptors.length,
      modelReady: pythonResult.model_ready
    });
  } catch (err) {
    console.error('Register face error:', err);
    res.status(500).json({ message: err.message });
  }
};