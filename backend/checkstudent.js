import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Get all students
    const students = await mongoose.connection.db.collection('users').find({ role: 'student' }).toArray();
    console.log('Students found:', students.length);
    students.forEach(s => console.log('-', s.email, 'ID:', s._id.toString()));
    
    // Get all exams with participants
    const exams = await mongoose.connection.db.collection('exams').find({}).toArray();
    console.log('\nExams:');
    exams.forEach(e => {
      console.log('-', e.title);
      console.log('  Participants:', e.participants?.length || 0);
      e.participants?.forEach(p => console.log('  -', p.toString()));
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

checkStudents();