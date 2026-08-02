import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const setPassword = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Set a simple known password
    const plainPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log('Setting password to:', plainPassword);
    console.log('New hash:', hashedPassword);
    
    // Update the admin
    const result = await mongoose.connection.db.collection('users').updateOne(
      { email: 'admin@examora.com' },
      { $set: { password: hashedPassword } }
    );
    
    console.log('Updated:', result.modifiedCount > 0 ? 'YES ✅' : 'NO ❌');
    
    // Verify it works
    const user = await mongoose.connection.db.collection('users').findOne({ email: 'admin@examora.com' });
    const verifyMatch = await bcrypt.compare(plainPassword, user.password);
    
    console.log('Verification test:', verifyMatch ? 'PASSED ✅' : 'FAILED ❌');
    
    if (verifyMatch) {
      console.log('\n✅ SUCCESS! Now login with:');
      console.log('Email: admin@examora.com');
      console.log('Password: admin123');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
};

setPassword();