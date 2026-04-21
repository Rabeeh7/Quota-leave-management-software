const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      console.log('Connected to MongoDB...');
      
      const leader = await User.findOne({ role: 'leader' });
      
      if (!leader) {
        console.log('❌ No leader account found in the database. You may need to create one via the superadmin panel.');
      } else {
        // Resetting password to default
        leader.password = 'Leader@123';
        // Marking as plain text so the pre-save hook hashes it automatically
        await leader.save();
        
        console.log('✅ Success! The Leader account password has been reset.');
        console.log('----------------------------------------------------');
        console.log(`Email      : ${leader.email || leader.username}`);
        console.log(`Password   : Leader@123`);
        console.log('----------------------------------------------------');
        console.log('You can now log in using the Admin / Leader tab.');
      }
      
      process.exit(0);
    } catch (err) {
      console.error('Error during password reset:', err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Failed to connect to the database:', err);
    process.exit(1);
  });
