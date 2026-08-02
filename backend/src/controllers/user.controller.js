import User from '../models/User.js';
import Session from '../models/Session.js';

// GET /api/users/profile
export const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/users/profile
export const updateProfile = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/face-status
export const getFaceStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Check both possible field names
    const hasFaceDescriptor = !!(user.faceDescriptor || 
                                 (user.faceDescriptors && user.faceDescriptors.length > 0));
    
    console.log('Face status check for:', user.email);
    console.log('faceDescriptor exists:', !!user.faceDescriptor);
    console.log('faceDescriptors exists:', !!(user.faceDescriptors && user.faceDescriptors.length > 0));
    console.log('Result - faceRegistered:', hasFaceDescriptor);
    
    res.json({
      faceRegistered: hasFaceDescriptor,
      faceRegisteredAt: user.faceRegisteredAt,
      faceImageUrl: user.faceImageUrl,
    });
  } catch (err) {
    console.error('Get face status error:', err);
    next(err);
  }
};

// DELETE /api/users/:id
export const deleteStudent = async (req, res, next) => {
  try {
    const student = await User.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.role !== 'student') {
      return res.status(400).json({ message: 'Only student accounts can be deleted here' });
    }

    const sessions = await Session.find({ student: student._id }).select('violations');
    const deletedSessionsCount = sessions.length;
    const deletedViolationsCount = sessions.reduce(
      (sum, session) => sum + (session.violations?.length || 0),
      0
    );

    await Session.deleteMany({ student: student._id });
    await User.findByIdAndDelete(student._id);

    res.json({
      message: 'Student deleted successfully',
      deletedStudentId: student._id,
      deletedSessionsCount,
      deletedViolationsCount,
    });
  } catch (err) {
    next(err);
  }
};
