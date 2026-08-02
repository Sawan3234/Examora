import bcrypt from 'bcryptjs';
const hash = await bcrypt.hash('Admin@123', 12);
console.log(hash);