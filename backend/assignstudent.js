import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const assignStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get all students
    const students = await mongoose.connection.db.collection('users').find({ role: 'student' }).toArray();
    const studentIds = students.map(s => s._id);
    
    console.log('Found students:', studentIds.length);
    
    // Update exam to include all students
    const result = await mongoose.connection.db.collection('exams').updateOne(
      { title: 'daa' },  // Find your exam
      { $set: { participants: studentIds } }
    );
    
    console.log('Exam updated:', result.modifiedCount > 0 ? 'YES ✅' : 'NO ❌');
    
    // Verify
    const exam = await mongoose.connection.db.collection('exams').findOne({ title: 'daa' });
    console.log('Participants now:', exam.participants?.length || 0);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

assignStudents();