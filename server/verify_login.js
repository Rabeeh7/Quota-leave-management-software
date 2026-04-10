const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: './.env' });

const User = require('./models/User');

const testLogin = async (username, password) => {
  console.log(`\n🔍 Testing login for: "${username}"`);
  
  try {
    const usernameTrim = username.trim();
    
    // This replicates the logic in server/routes/auth.js
    const query = {
      $or: [
        { roll_no: usernameTrim },
        { username: usernameTrim },
        { email: usernameTrim.toLowerCase() },
        { name: usernameTrim }
      ]
    };
    
    const user = await User.findOne(query);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('❌ Invalid password');
      return;
    }
    
    console.log(`✅ Login successful!`);
    console.log(`   User: ${user.name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   ID:   ${user._id}`);
  } catch (err) {
    console.error('❌ Error during test:', err);
  }
};

const runTests = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Test cases from seed data:
  // Student 1: Mohammed Ajmal, roll_no: CS001, email: N/A in seed but let's assume one
  
  // 1. Roll Number
  await testLogin('CS001', 'CS001');
  
  // 2. Name
  await testLogin('Mohammed Ajmal', 'CS001');
  
  // 3. Name (Case sensitive check)
  await testLogin('mohammed ajmal', 'CS001'); // This will likely fail as we didn't use case-insensitive matching for name
  
  // 4. Roll Number (wrong password)
  await testLogin('CS001', 'wrong');

  await mongoose.disconnect();
};

runTests();
